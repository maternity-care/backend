import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { ActiveStatus, FacilityStatus } from '../../common/constants/status.enum';
import { PaginationResult } from '../../common/helpers/pagination';
import { ShiftSlot } from '../../database/entities/shift-slot.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import {
  CreateShiftSlotDto,
  SHIFT_SLOT_APPLICABLE_DAYS,
  ShiftSlotApplicableDay,
} from './dto/requests/create-shift-slot.dto';
import { LookupShiftSlotDto, SearchShiftSlotDto } from './dto/requests/search-shift-slot.dto';
import { UpdateShiftSlotDto } from './dto/requests/update-shift-slot.dto';
import {
  getTimeRangeDurationMinutes,
  isOvernightRange,
  normalizeTime,
  timesOverlap,
} from './helpers/shifts.helper';

type OperatingHourLike = {
  dayOfWeek: string;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean;
};

@Injectable()
export class ShiftSlotsService {
  constructor(
    @InjectRepository(ShiftSlot)
    private readonly repository: Repository<ShiftSlot>,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  /** Tao khung ca mau rieng cho tung co so, vi moi co so co the co gio truc khac nhau. */
  async create(dto: CreateShiftSlotDto): Promise<ShiftSlot> {
    await this.ensureActiveFacility(dto.facilityId);
    this.validateSlotTime(dto.startTime, dto.endTime);

    const status = dto.status ?? ActiveStatus.ACTIVE;
    const isOvernight = isOvernightRange(dto.startTime, dto.endTime);
    const code = await this.generateUniqueCode(dto.facilityId, dto.name);
    await this.ensureUniqueSlot(dto.facilityId, dto.name);
    let applicableDays: ShiftSlotApplicableDay[] | null = null;
    if (status === ActiveStatus.ACTIVE) {
      applicableDays = await this.resolveApplicableDays(
        dto.facilityId,
        dto.startTime,
        dto.endTime,
        dto.applicableDays,
      );
      await this.ensureNoTimeOverlap(dto.facilityId, dto.startTime, dto.endTime, applicableDays);
    }

    const slot = this.repository.create({
      facilityId: dto.facilityId,
      code,
      name: dto.name,
      startTime: normalizeTime(dto.startTime),
      endTime: normalizeTime(dto.endTime),
      isOvernight,
      applicableDays,
      status,
    });

    return this.repository.save(slot);
  }

  /** Lay danh sach khung ca de quan ly, co ho tro search/filter/page. */
  async findAll(filters?: SearchShiftSlotDto): Promise<ShiftSlot[]> {
    const slots = await this.buildListQuery(filters).getMany();
    this.ensureFound(slots);
    return slots;
  }

  /** Lay danh sach khung ca co phan trang. */
  async findAllPaginated(filters?: SearchShiftSlotDto): Promise<PaginationResult<ShiftSlot>> {
    const query = this.buildListQuery(filters);
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    this.ensureFound(items);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Lookup cho FE chon slot khi tao ca truc: neu co facilityId thi chi tra slot cua co so do. */
  async lookup(filters?: LookupShiftSlotDto): Promise<ShiftSlot[]> {
    const query = this.repository
      .createQueryBuilder('slot')
      .where('slot.deletedAt IS NULL')
      .andWhere('slot.status = :status', { status: filters?.status ?? ActiveStatus.ACTIVE })
      .orderBy('slot.startTime', 'ASC')
      .addOrderBy('slot.endTime', 'ASC')
      .addOrderBy('slot.name', 'ASC')
      .take(Math.max(1, Number(filters?.limit) || 20));

    if (filters?.facilityId) {
      query.andWhere('slot.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    if (filters?.search) {
      query.andWhere(
        '(LOWER(slot.name) LIKE LOWER(:search) OR LOWER(slot.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  /** Lay chi tiet mot slot. */
  async findById(id: string): Promise<ShiftSlot> {
    this.validateId(id);
    const slot = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { facility: true },
    });
    if (!slot) throw new NotFoundException(RESPONSE_MESSAGES.SHIFT_SLOTS.NOT_FOUND);
    return slot;
  }

  /** Cap nhat slot cua co so. Neu doi ten/facility thi backend sinh lai code theo pham vi co so moi. */
  async update(id: string, dto: UpdateShiftSlotDto): Promise<ShiftSlot> {
    const slot = await this.findById(id);
    const targetFacilityId = dto.facilityId ?? slot.facilityId;
    const targetName = dto.name ?? slot.name;
    const targetStartTime = dto.startTime ?? slot.startTime;
    const targetEndTime = dto.endTime ?? slot.endTime;
    const targetStatus = dto.status ?? slot.status;

    if (dto.facilityId && dto.facilityId !== slot.facilityId) {
      await this.ensureActiveFacility(dto.facilityId);
    }

    this.validateSlotTime(targetStartTime, targetEndTime);
    const targetIsOvernight = isOvernightRange(targetStartTime, targetEndTime);
    let targetApplicableDays = dto.applicableDays !== undefined
      ? this.normalizeApplicableDays(dto.applicableDays)
      : this.normalizeStoredApplicableDays(slot.applicableDays);

    if (targetStatus === ActiveStatus.ACTIVE) {
      targetApplicableDays = await this.resolveApplicableDays(
        targetFacilityId,
        targetStartTime,
        targetEndTime,
        dto.applicableDays !== undefined ? dto.applicableDays : targetApplicableDays,
      );
      await this.ensureNoTimeOverlap(
        targetFacilityId,
        targetStartTime,
        targetEndTime,
        targetApplicableDays,
        slot.id,
      );
    }

    if (targetName !== slot.name || targetFacilityId !== slot.facilityId) {
      await this.ensureUniqueSlot(targetFacilityId, targetName, slot.id);
      slot.code = await this.generateUniqueCode(targetFacilityId, targetName, slot.id);
      slot.name = targetName;
    }

    if (targetFacilityId !== slot.facilityId) slot.facilityId = targetFacilityId;
    if (dto.startTime !== undefined) slot.startTime = normalizeTime(dto.startTime);
    if (dto.endTime !== undefined) slot.endTime = normalizeTime(dto.endTime);
    slot.isOvernight = targetIsOvernight;
    if (targetStatus === ActiveStatus.ACTIVE || dto.applicableDays !== undefined) {
      slot.applicableDays = targetApplicableDays;
    }
    if (dto.status !== undefined) slot.status = dto.status;

    return this.repository.save(slot);
  }

  /** Xoa cung khung ca. Ca truc cu giu startTime/endTime va slotId duoc DB set null. */
  async remove(id: string) {
    const slot = await this.findById(id);
    const dependencyCount = await this.countShiftDependencies(slot.id);
    await this.repository.remove(slot);
    return { action: 'hard_deleted', affectedCount: dependencyCount };
  }

  private buildListQuery(filters?: SearchShiftSlotDto): SelectQueryBuilder<ShiftSlot> {
    const query = this.repository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.facility', 'facility')
      .where('slot.deletedAt IS NULL')
      .orderBy('slot.startTime', 'ASC')
      .addOrderBy('slot.endTime', 'ASC')
      .addOrderBy('slot.createdAt', 'DESC');

    if (filters?.facilityId) {
      query.andWhere('slot.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    if (filters?.status) {
      query.andWhere('slot.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(LOWER(slot.name) LIKE LOWER(:search) OR LOWER(slot.code) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }

  private async ensureActiveFacility(facilityId: string): Promise<void> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFT_SLOTS.FACILITY_INACTIVE);
    }
  }

  private validateSlotTime(startTime: string, endTime: string): void {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    if (normalizedStart === normalizedEnd) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFT_SLOTS.END_TIME_AFTER_START_TIME);
    }
    const duration = getTimeRangeDurationMinutes(normalizedStart, normalizedEnd);
    if (duration < 15 || duration > 12 * 60) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.DURATION_INVALID);
    }
  }

  private async ensureUniqueSlot(facilityId: string, name: string, excludeId?: string): Promise<void> {
    const query = this.repository
      .createQueryBuilder('slot')
      .where('slot.facilityId = :facilityId', { facilityId })
      .andWhere('LOWER(slot.name) = LOWER(:name)', { name })
      .andWhere('slot.deletedAt IS NULL');

    if (excludeId) query.andWhere('slot.id != :excludeId', { excludeId });

    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException({
        message: RESPONSE_MESSAGES.SHIFT_SLOTS.DUPLICATED,
        data: {
          duplicatedField: 'name',
          duplicatedData: existing,
        },
      });
    }
  }

  private async ensureNoTimeOverlap(
    facilityId: string,
    startTime: string,
    endTime: string,
    applicableDays: ShiftSlotApplicableDay[],
    excludeId?: string,
  ): Promise<void> {
    const query = this.repository
      .createQueryBuilder('slot')
      .where('slot.facilityId = :facilityId', { facilityId })
      .andWhere('slot.deletedAt IS NULL')
      .andWhere('slot.status = :status', { status: ActiveStatus.ACTIVE });

    if (excludeId) query.andWhere('slot.id != :excludeId', { excludeId });

    const existing = (await query.getMany()).find((slot) => {
      const existingDays = this.normalizeStoredApplicableDays(slot.applicableDays);
      return this.hasAnyApplicableDayOverlap(applicableDays, existingDays)
        && timesOverlap(startTime, endTime, slot.startTime, slot.endTime);
    });
    if (existing) {
      throw new ConflictException({
        message: RESPONSE_MESSAGES.SHIFT_SLOTS.TIME_OVERLAP,
        data: {
          duplicatedField: 'timeRange',
          duplicatedData: existing,
        },
      });
    }
  }

  private async resolveApplicableDays(
    facilityId: string,
    startTime: string,
    endTime: string,
    requestedDays?: ShiftSlotApplicableDay[] | string[] | null,
  ): Promise<ShiftSlotApplicableDay[]> {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    const schedule = await this.facilitiesService.getOperatingHours(facilityId);
    const operatingHours = schedule.operatingHours as OperatingHourLike[];
    const candidateDays = requestedDays === undefined
      ? [...SHIFT_SLOT_APPLICABLE_DAYS]
      : this.normalizeApplicableDays(requestedDays);
    const applicableDays = candidateDays.filter(day =>
      this.slotFitsFacilityDay(day, operatingHours, normalizedStart, normalizedEnd),
    );

    if (requestedDays !== undefined && applicableDays.length !== candidateDays.length) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFT_SLOTS.APPLICABLE_DAYS_INVALID);
    }

    if (applicableDays.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFT_SLOTS.OUTSIDE_FACILITY_HOURS);
    }

    return applicableDays;
  }

  private slotFitsFacilityDay(
    day: ShiftSlotApplicableDay,
    operatingHours: OperatingHourLike[],
    normalizedStart: string,
    normalizedEnd: string,
  ): boolean {
    const item = operatingHours.find(hour => hour.dayOfWeek === day);
    if (!item || item.isClosed || !item.openTime || !item.closeTime) return false;
    const openTime = normalizeTime(String(item.openTime));
    const closeTime = normalizeTime(String(item.closeTime));

    if (!isOvernightRange(normalizedStart, normalizedEnd)) {
      return normalizedStart >= openTime && normalizedEnd <= closeTime;
    }

    const nextDay = this.getNextApplicableDay(day);
    const nextItem = operatingHours.find(hour => hour.dayOfWeek === nextDay);
    if (!nextItem || nextItem.isClosed || !nextItem.openTime || !nextItem.closeTime) return false;

    return normalizedStart >= openTime
      && closeTime >= '23:59:00'
      && normalizeTime(String(nextItem.openTime)) <= '00:00:00'
      && normalizedEnd <= normalizeTime(String(nextItem.closeTime));
  }

  private getNextApplicableDay(day: ShiftSlotApplicableDay): ShiftSlotApplicableDay {
    const index = SHIFT_SLOT_APPLICABLE_DAYS.indexOf(day);
    return SHIFT_SLOT_APPLICABLE_DAYS[(index + 1) % SHIFT_SLOT_APPLICABLE_DAYS.length];
  }

  private normalizeApplicableDays(days: ShiftSlotApplicableDay[] | string[] | null): ShiftSlotApplicableDay[] {
    const orderedDays = new Set(
      (days ?? []).map(day => String(day).trim().toUpperCase()),
    );
    const normalized = SHIFT_SLOT_APPLICABLE_DAYS.filter(day => orderedDays.has(day));
    if (normalized.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFT_SLOTS.APPLICABLE_DAYS_INVALID);
    }
    return normalized;
  }

  private normalizeStoredApplicableDays(days: unknown): ShiftSlotApplicableDay[] {
    if (!Array.isArray(days) || days.length === 0) {
      return [...SHIFT_SLOT_APPLICABLE_DAYS];
    }
    return this.normalizeApplicableDays(days.map(String));
  }

  private hasAnyApplicableDayOverlap(
    firstDays: ShiftSlotApplicableDay[],
    secondDays: ShiftSlotApplicableDay[],
  ): boolean {
    const secondSet = new Set(secondDays);
    return firstDays.some(day => secondSet.has(day));
  }

  private async generateUniqueCode(facilityId: string, name: string, excludeId?: string): Promise<string> {
    const baseCode = this.buildCodePrefixFromName(name);
    const existingCodes = await this.findCodesByPrefix(facilityId, baseCode, excludeId);
    if (!existingCodes.includes(baseCode)) return baseCode;

    for (let index = 2; index <= 99; index += 1) {
      const code = `${baseCode}_${String(index).padStart(2, '0')}`;
      if (!existingCodes.includes(code)) return code;
    }

    throw new ConflictException(RESPONSE_MESSAGES.SHIFT_SLOTS.CODE_GENERATE_FAILED);
  }

  private async findCodesByPrefix(facilityId: string, prefix: string, excludeId?: string): Promise<string[]> {
    const query = this.repository
      .createQueryBuilder('slot')
      .withDeleted()
      .select('slot.code', 'code')
      .where('slot.facilityId = :facilityId', { facilityId })
      .andWhere('slot.code LIKE :pattern', { pattern: `${prefix}%` });

    if (excludeId) query.andWhere('slot.id != :excludeId', { excludeId });

    const rows = await query.getRawMany<{ code: string }>();
    return rows.map(row => row.code);
  }

  private buildCodePrefixFromName(name: string): string {
    const normalized = String(name)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    return normalized ? normalized.split(' ').join('_').slice(0, 40) : 'SHIFT_SLOT';
  }

  private async countShiftDependencies(slotId: string): Promise<number> {
    const row = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('shifts', 'shift')
      .where('shift.slot_id = :slotId', { slotId })
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  private validateId(id: string): void {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFT_SLOTS.ID_INVALID);
    }
  }

  private ensureFound(slots: ShiftSlot[]): void {
    if (!slots || slots.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.SHIFT_SLOTS.NOT_FOUND);
    }
  }
}
