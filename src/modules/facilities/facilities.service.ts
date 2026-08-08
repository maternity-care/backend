import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { SearchFacilityAdminOptionsDto } from './dto/requests/search-facility-admin-options.dto';
import { LookupFacilityDto, SearchFacilityDto } from './dto/requests/search-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { FacilityOperatingHourGroupDto } from './dto/requests/facility-schedule.dto';
import { UpdateFacilityOperatingHoursDto } from './dto/requests/update-facility-operating-hours.dto';
import { ApplyFacilityOperatingHoursDto, OperatingHoursSlotStrategy } from './dto/requests/apply-facility-operating-hours.dto';
import {
  CreateFacilityClosureDayDto,
  SearchFacilityClosureDayDto,
  UpdateFacilityClosureDayDto,
} from './dto/requests/facility-closure-day.dto';
import { SuspendResourceDto } from '../../common/dto/suspend-resource.dto';
import { Facility } from './entities/facility.entity';
import { FacilityClosureDay } from './entities/facility-closure-day.entity';
import { FacilityDayOfWeek } from './entities/facility-operating-hour.entity';
import {
  FACILITIES_REPOSITORY,
  FacilitySuspendImpact,
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from './interfaces/facility-repository.interface';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { ActiveStatus, FacilityStatus, InactiveSource } from '../../common/constants/status.enum';
import { AppointmentDisruptionsService } from '../appointment-disruptions/appointment-disruptions.service';
import { FacilityImpactRepository } from './repositories/facility-impact.repository';
import { FacilityOperatingHoursService } from './facility-operating-hours.service';
import { FacilityClosureDaysService } from './facility-closure-days.service';

@Injectable()
export class FacilitiesService {
  constructor(
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
    private readonly facilityImpactRepository: FacilityImpactRepository,
    private readonly facilityOperatingHoursService: FacilityOperatingHoursService,
    private readonly facilityClosureDaysService: FacilityClosureDaysService,
    @Optional() private readonly appointmentDisruptions?: AppointmentDisruptionsService,
  ) {}

  async create(dto: CreateFacilityDto): Promise<FacilityWithDetails> {
    await this.ensureOwnerCanManageFacility(dto.ownerId);
    await this.ensureUniqueFacilityIdentity(dto);
    const code = await this.generateFacilityCode(dto.province);
    const operatingHours = this.facilityOperatingHoursService.buildOperatingHoursForCreate(dto.schedules);

    const { id: _ignoredId, schedules: _ignoredSchedules, ...createPayload } = dto as CreateFacilityDto & { id?: string };
    const facility = this.facilitiesRepository.create({ ...createPayload, code });
    const saved = await this.facilitiesRepository.save(facility);
    await this.facilityOperatingHoursService.updateOperatingHours(saved.id, { schedules: dto.schedules ?? [] });
    return this.findDetailsById(saved.id);
  }

  async findAll(query?: SearchFacilityDto): Promise<FacilityWithDetails[]> {
    const facilities = await this.facilitiesRepository.findAll(query);
    if (!facilities || facilities.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
    return Promise.all(facilities.map(facility => this.facilityOperatingHoursService.attachFacilitySchedule(facility)));
  }

  async findAllPaginated(query?: SearchFacilityDto) {
    const result = await this.facilitiesRepository.findAllPaginated!(query);
    if (!result || !result.items || result.items.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
    return {
      ...result,
      items: await Promise.all(result.items.map(facility => this.facilityOperatingHoursService.attachFacilitySchedule(facility))),
    };
  }

  async findById(id: string): Promise<Facility> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }

    return this.reactivateExpiredFacilityIfNeeded(facility);
  }

  async findDetailsById(id: string): Promise<FacilityWithDetails> {
    await this.reactivateExpiredFacilityById(id);
    const facility = await this.facilitiesRepository.findDetailsById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }

    return this.facilityOperatingHoursService.attachFacilitySchedule(facility);
  }

  findByCode(code: string): Promise<Facility | null> {
    return this.facilitiesRepository.findByCode(code);
  }

  async findByName(name: string): Promise<Facility | null> {
    return this.facilitiesRepository.findByName(name);
  }

  async update(id: string, dto: UpdateFacilityDto): Promise<FacilityWithDetails> {
    this.ensureStatusIsNotUpdated(dto);
    const facility = await this.findById(id);
    const updatableDto = this.removeReadonlyCode(dto);

    if (updatableDto.ownerId && updatableDto.ownerId !== facility.ownerId) {
      await this.ensureOwnerCanManageFacility(updatableDto.ownerId);
    }

    await this.ensureUniqueFacilityIdentity(updatableDto, facility.id);

    Object.assign(facility, updatableDto);
    const saved = await this.facilitiesRepository.save(facility);
    return this.findDetailsById(saved.id);
  }

  async lookup(query?: LookupFacilityDto): Promise<FacilityLookup[]> {
    return this.facilitiesRepository.lookup(query);
  }

  async findAdminOptions(query?: SearchFacilityAdminOptionsDto) {
    return this.facilitiesRepository.findAdminOptions(query);
  }

  async remove(id: string, reason?: string, deletedBy?: string | null): Promise<SafeRemoveResult> {
    const facility = await this.findById(id);
    const dependencyCount = await this.facilitiesRepository.countDependencies(facility.id);
    if (dependencyCount === 0) {
      await this.facilitiesRepository.remove(facility);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.facilitiesRepository.softDelete(facility, reason, deletedBy);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  async suspend(
    id: string,
    dto: SuspendResourceDto,
    actorId?: string | null,
  ): Promise<{ facility: FacilityWithDetails; impact: FacilitySuspendImpact }> {
    const facility = await this.findById(id);
    const now = new Date();
    const inactiveUntil = this.parseInactiveUntil(dto.inactiveUntil, 'inactiveUntil phai lon hon thoi diem hien tai');
    const impact = await this.facilityImpactRepository.countSuspendImpact(facility.id, now, inactiveUntil);

    facility.status = FacilityStatus.INACTIVE;
    facility.inactiveFrom = now;
    facility.inactiveUntil = inactiveUntil;
    facility.inactiveReason = dto.reason ?? null;
    facility.inactiveSource = InactiveSource.MANUAL;
    facility.inactiveBy = actorId ?? null;
    facility.reactivatedAt = null;
    facility.reactivatedBy = null;
    await this.facilitiesRepository.save(facility);
    const suspendedRooms = await this.facilityImpactRepository.suspendActiveRoomsForFacility(
      facility.id,
      now,
      inactiveUntil,
      dto.reason ?? null,
      actorId ?? null,
    );
    const cancelledShifts = await this.facilityImpactRepository.cancelFutureShiftsForFacility(
      facility.id,
      now,
      inactiveUntil,
      dto.reason ?? null,
      actorId ?? null,
    );
    await this.appointmentDisruptions?.dispatchBySource('facility', facility.id);

    return {
      facility: await this.findDetailsById(facility.id),
      impact: { ...impact, suspendedRooms, cancelledShifts },
    };
  }

  async reactivate(
    id: string,
    actorId?: string | null,
  ): Promise<{ facility: FacilityWithDetails; impact: Pick<FacilitySuspendImpact, 'reactivatedRooms'> }> {
    const facility = await this.findById(id);
    facility.status = FacilityStatus.ACTIVE;
    facility.inactiveSource = null;
    facility.reactivatedAt = new Date();
    facility.reactivatedBy = actorId ?? null;
    await this.facilitiesRepository.save(facility);
    const reactivatedRooms = await this.facilityImpactRepository.reactivateRoomsSuspendedByFacility(facility.id, actorId ?? null);

    return {
      facility: await this.findDetailsById(facility.id),
      impact: { reactivatedRooms },
    };
  }

  async getOperatingHours(id: string) {
    return this.facilityOperatingHoursService.getOperatingHours(id);
  }

  async previewOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    return this.facilityOperatingHoursService.previewOperatingHours(id, dto);
  }

  async updateOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    return this.facilityOperatingHoursService.updateOperatingHours(id, dto);
  }

  async applyOperatingHours(id: string, dto: ApplyFacilityOperatingHoursDto) {
    return this.facilityOperatingHoursService.applyOperatingHours(id, dto);
  }

  async getClosureDays(id: string, query?: SearchFacilityClosureDayDto) {
    return this.facilityClosureDaysService.getClosureDays(id, query);
  }

  async createClosureDay(id: string, dto: CreateFacilityClosureDayDto) {
    return this.facilityClosureDaysService.createClosureDay(id, dto);
  }

  async updateClosureDay(id: string, closureDayId: string, dto: UpdateFacilityClosureDayDto) {
    return this.facilityClosureDaysService.updateClosureDay(id, closureDayId, dto);
  }

  async removeClosureDay(id: string, closureDayId: string) {
    return this.facilityClosureDaysService.removeClosureDay(id, closureDayId);
  }

  private async ensureOwnerCanManageFacility(ownerId?: string): Promise<void> {
    if (!ownerId) return;

    const ownerExists = await this.facilitiesRepository.existsActiveOwner(ownerId);
    if (!ownerExists) {
      throw new BadRequestException(RESPONSE_MESSAGES.FACILITIES.OWNER_INVALID);
    }
  }

  private async ensureUniqueFacilityIdentity(
    dto: Partial<Pick<CreateFacilityDto, 'name' | 'email' | 'phone'>> & { code?: string },
    excludeId?: string,
  ): Promise<void> {
    const checks: Array<{
      field: 'code' | 'name' | 'email' | 'phone';
      value?: string;
      findExisting: () => Promise<Facility | null>;
    }> = [
      { field: 'code', value: dto.code, findExisting: () => this.facilitiesRepository.findByCode(dto.code!) },
      { field: 'name', value: dto.name, findExisting: () => this.facilitiesRepository.findByName(dto.name!) },
      { field: 'email', value: dto.email, findExisting: () => this.facilitiesRepository.findByEmail(dto.email!) },
      { field: 'phone', value: dto.phone, findExisting: () => this.facilitiesRepository.findByPhone(dto.phone!) },
    ];

    for (const check of checks) {
      if (!check.value) continue;

      const existing = await check.findExisting();
      if (existing && existing.id !== excludeId) {
        this.throwDuplicateFacilityException(check.field, existing);
      }
    }
  }

  private parseInactiveUntil(value: string | null | undefined, errorMessage: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
      throw new BadRequestException(errorMessage);
    }
    return parsed;
  }

  private ensureStatusIsNotUpdated(dto: UpdateFacilityDto): void {
    if (Object.prototype.hasOwnProperty.call(dto, 'status')) {
      throw new BadRequestException('Khong doi status bang API update thong tin. Hay dung /suspend hoac /reactivate.');
    }
  }

  private async reactivateExpiredFacilityById(id: string): Promise<void> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) return;
    await this.reactivateExpiredFacilityIfNeeded(facility);
  }

  private async reactivateExpiredFacilityIfNeeded(facility: Facility): Promise<Facility> {
    if (
      facility.status === FacilityStatus.INACTIVE &&
      facility.inactiveUntil &&
      facility.inactiveUntil <= new Date()
    ) {
      facility.status = FacilityStatus.ACTIVE;
      facility.inactiveSource = null;
      facility.reactivatedAt = new Date();
      facility.reactivatedBy = null;
      const saved = await this.facilitiesRepository.save(facility);
      await this.facilityImpactRepository.reactivateRoomsSuspendedByFacility(facility.id, null);
      return saved;
    }

    return facility;
  }

  private throwDuplicateFacilityException(field: 'code' | 'name' | 'email' | 'phone', facility: Facility): never {
    throw new ConflictException({
      message: RESPONSE_MESSAGES.FACILITIES.ALREADY_EXISTS,
      data: {
        duplicatedField: field,
        duplicatedData: this.toDuplicateFacilityData(facility),
      },
    });
  }

  private toDuplicateFacilityData(facility: Facility) {
    return {
      id: facility.id,
      code: facility.code,
      name: facility.name,
      phone: facility.phone,
      email: facility.email,
      address: facility.address,
      province: facility.province,
      ward: facility.ward,
      status: facility.status,
    };
  }

  private async generateFacilityCode(province?: string | null): Promise<string> {
    const prefix = `CS-${this.buildProvinceAbbreviation(province)}`;
    const existingCodes = await this.facilitiesRepository.findCodesByPrefix(prefix);
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextSequence = existingCodes.reduce((maxSequence, code) => {
      const match = code.match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
      return match ? Math.max(maxSequence, Number(match[1])) : maxSequence;
    }, 0) + 1;

    return `${prefix}-${String(nextSequence).padStart(2, '0')}`;
  }

  private buildProvinceAbbreviation(province?: string | null): string {
    if (!province || !String(province).trim()) {
      return 'VN';
    }

    const normalizedProvince = this.normalizeVietnameseText(province)
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(THANH PHO|TINH|TP)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedProvince.split(' ').filter(Boolean);
    if (words.length === 0) return 'VN';
    return words.map(word => word[0]).join('').toUpperCase();
  }

  private normalizeVietnameseText(value: string): string {
    return String(value)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private removeReadonlyCode(dto: UpdateFacilityDto): UpdateFacilityDto {
    const { code: _readonlyCode, ...updatableDto } = dto as UpdateFacilityDto & { code?: string };
    return updatableDto;
  }
}
