import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { SearchFacilityAdminOptionsDto } from './dto/requests/search-facility-admin-options.dto';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { UpdateFacilityOperatingHoursDto } from './dto/requests/update-facility-operating-hours.dto';
import { ApplyFacilityOperatingHoursDto } from './dto/requests/apply-facility-operating-hours.dto';
import { SuspendResourceDto } from '../../common/dto/suspend-resource.dto';
import { Facility } from './entities/facility.entity';
import {
  FACILITIES_REPOSITORY,
  FacilitySuspendImpact,
  FacilityWithDetails,
  IFacilitiesRepository,
} from './interfaces/facility-repository.interface';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { FacilityStatus, InactiveSource } from '../../common/constants/status.enum';
import { AppointmentDisruptionsService } from '../appointment-disruptions/appointment-disruptions.service';
import { FacilityImpactRepository } from './repositories/facility-impact.repository';
import { FacilityOperatingHoursService } from './facility-operating-hours.service';
import { buildFacilityCodePrefix, buildNextFacilityCode } from './helpers/facility-code.helper';
import { parseFutureDateOrNull } from './helpers/facility-suspension.helper';

@Injectable()
export class FacilitiesService {
  constructor(
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
    private readonly facilityImpactRepository: FacilityImpactRepository,
    private readonly facilityOperatingHoursService: FacilityOperatingHoursService,
    @Optional() private readonly appointmentDisruptions?: AppointmentDisruptionsService,
  ) {}

  async create(dto: CreateFacilityDto): Promise<FacilityWithDetails> {
    await this.ensureOwnerCanManageFacility(dto.ownerId);
    await this.ensureUniqueFacilityIdentity(dto);
    const code = await this.generateFacilityCode(dto.province);

    const { id: _ignoredId, schedules: _ignoredSchedules, ...createPayload } = dto as CreateFacilityDto & { id?: string };
    const facility = this.facilitiesRepository.create({ ...createPayload, code });
    const saved = await this.facilitiesRepository.save(facility);
    await this.facilityOperatingHoursService.initializeOperatingHours(saved.id, dto.schedules);
    return this.findDetailsById(saved.id);
  }

  async findAllPaginated(query?: SearchFacilityDto) {
    const result = await this.facilitiesRepository.findAllPaginated(query);
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


  // Đình chỉ hoạt động của cơ sở y tế và tính toán tác động của việc đình chỉ
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
    // Gửi thông báo về sự gián đoạn cuộc hẹn do đình chỉ hoạt động của cơ sở y tế
    const suspendedRooms = await this.facilityImpactRepository.suspendActiveRoomsForFacility(
      facility.id,
      now,
      inactiveUntil,
      dto.reason ?? null,
      actorId ?? null,
    );
    // Gửi thông báo về sự gián đoạn cuộc hẹn do đình chỉ hoạt động của cơ sở y tế
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

  // Lấy giờ hoạt động của cơ sở y tế
  async getOperatingHours(id: string) {
    return this.facilityOperatingHoursService.getOperatingHours(id);
  }

  // Xem trước giờ hoạt động của cơ sở y tế dựa trên dữ liệu được cung cấp
  async previewOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    return this.facilityOperatingHoursService.previewOperatingHours(id, dto);
  }

  async applyOperatingHours(id: string, dto: ApplyFacilityOperatingHoursDto) {
    return this.facilityOperatingHoursService.applyOperatingHours(id, dto);
  }

  // Xóa ngày đóng cửa của cơ sở y tế
  //kiểm tra chủ cơ sở tồn tại
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
    return parseFutureDateOrNull(value, errorMessage);
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
    const prefix = buildFacilityCodePrefix(province);
    const existingCodes = await this.facilitiesRepository.findCodesByPrefix(prefix);
    return buildNextFacilityCode(province, existingCodes);
  }

  private removeReadonlyCode(dto: UpdateFacilityDto): UpdateFacilityDto {
    const { code: _readonlyCode, ...updatableDto } = dto as UpdateFacilityDto & { code?: string };
    return updatableDto;
  }
}
