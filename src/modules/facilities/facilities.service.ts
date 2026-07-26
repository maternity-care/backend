import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { LookupFacilityDto, SearchFacilityDto } from './dto/requests/search-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { FacilityOperatingHourGroupDto } from './dto/requests/facility-schedule.dto';
import { UpdateFacilityOperatingHoursDto } from './dto/requests/update-facility-operating-hours.dto';
import {
  CreateFacilityClosureDayDto,
  SearchFacilityClosureDayDto,
  UpdateFacilityClosureDayDto,
} from './dto/requests/facility-closure-day.dto';
import { Facility } from './entities/facility.entity';
import { FacilityClosureDay } from './entities/facility-closure-day.entity';
import { FacilityDayOfWeek } from './entities/facility-operating-hour.entity';
import {
  FACILITIES_REPOSITORY,
  FacilityShiftScheduleViolation,
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from './interfaces/facility-repository.interface';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { ActiveStatus, FacilityOperatingStatus, FacilityStatus } from '../../common/constants/status.enum';
import { addDays, isOvernightRange } from '../shifts/helpers/shifts.helper';

@Injectable()
export class FacilitiesService {
  constructor(
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
  ) {}

  async create(dto: CreateFacilityDto): Promise<FacilityWithDetails> {
    await this.ensureOwnerCanManageFacility(dto.ownerId);
    await this.ensureUniqueFacilityIdentity(dto);
    const code = await this.generateFacilityCode(dto.province);
    const operatingHours = this.buildOperatingHoursForCreate(dto);

    const { id: _ignoredId, schedules: _ignoredSchedules, ...createPayload } = dto as CreateFacilityDto & { id?: string };
    const facility = this.facilitiesRepository.create({ ...createPayload, code });
    const saved = await this.facilitiesRepository.save(facility);
    await this.facilitiesRepository.syncOperatingHours(saved.id, operatingHours);
    return this.findDetailsById(saved.id);
  }

  async findAll(query?: SearchFacilityDto): Promise<FacilityWithDetails[]> {
    const facilities = await this.facilitiesRepository.findAll(query);
    if (!facilities || facilities.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
    return Promise.all(facilities.map(facility => this.attachFacilitySchedule(facility)));
  }

  async findAllPaginated(query?: SearchFacilityDto) {
    const result = await this.facilitiesRepository.findAllPaginated!(query);
    if (!result || !result.items || result.items.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
    return {
      ...result,
      items: await Promise.all(result.items.map(facility => this.attachFacilitySchedule(facility))),
    };
  }

  async findById(id: string): Promise<Facility> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }

    return facility;
  }

  async findDetailsById(id: string): Promise<FacilityWithDetails> {
    const facility = await this.facilitiesRepository.findDetailsById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }

    return this.attachFacilitySchedule(facility);
  }

  findByCode(code: string): Promise<Facility | null> {
    return this.facilitiesRepository.findByCode(code);
  }

  async findByName(name: string): Promise<Facility | null> {
    return this.facilitiesRepository.findByName(name);
  }

  async update(id: string, dto: UpdateFacilityDto): Promise<FacilityWithDetails> {
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

  async deActivateFacility(id: string): Promise<Facility> {
    const facility = await this.facilitiesRepository.deActivateFacility(id);
    return facility;
  }

  async getOperatingHours(id: string) {
    const facility = await this.findById(id);
    const operatingHours = await this.getOperatingHoursOrDefault(facility);

    return {
      operatingHours,
      operatingHourGroups: this.groupOperatingHoursForDisplay(operatingHours),
    };
  }

  /**
   * Preview thay doi gio hoat dong truoc khi luu:
   * - Build lich gio moi tu payload.
   * - Kiem tra cac shift sap toi con active/full co bi nam ngoai khung gio moi khong.
   * - Khong sync DB, chi tra canUpdate + impactedShifts de FE hien thi confirm/canh bao.
   */
  async previewOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    const facility = await this.findById(id);
    const operatingHours = await this.buildOperatingHoursFromGroupedInput(facility, dto);
    const impactedShifts = await this.findOperatingHourImpactedShifts(facility.id, operatingHours);

    return {
      canUpdate: impactedShifts.length === 0,
      summary: {
        impactedShiftCount: impactedShifts.length,
      },
      operatingHours,
      operatingHourGroups: this.groupOperatingHoursForDisplay(operatingHours),
      impactedShifts,
    };
  }

  async updateOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    const facility = await this.findById(id);
    const operatingHours = await this.buildOperatingHoursFromGroupedInput(facility, dto);

    await this.ensureOperatingHoursCompatibleWithUpcomingShifts(facility.id, operatingHours);
    await this.facilitiesRepository.syncOperatingHours(facility.id, operatingHours);
    return this.getOperatingHours(facility.id);
  }

  // Lay danh sach ngay dong cua/dong cua dac biet cua mot co so.
  async getClosureDays(id: string, query?: SearchFacilityClosureDayDto) {
    await this.findById(id);
    this.ensureValidClosureDateRange(query);
    return this.facilitiesRepository.findClosureDaysByFacilityId(id, query);
  }

  // Them mot ngay co so khong hoat dong, vi du 2026-09-02.
  async createClosureDay(id: string, dto: CreateFacilityClosureDayDto) {
    await this.findById(id);
    await this.ensureUniqueClosureDate(id, dto.closureDate);

    const closureDay = this.facilitiesRepository.createClosureDay({
      facilityId: id,
      closureDate: dto.closureDate,
      reason: dto.reason ?? null,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
    const saved = await this.facilitiesRepository.saveClosureDay(closureDay);
    return this.toClosureDayResponse(saved);
  }

  // Cap nhat ngay dong cua: doi ngay, ly do hoac trang thai active/inactive.
  async updateClosureDay(id: string, closureDayId: string, dto: UpdateFacilityClosureDayDto) {
    await this.findById(id);
    const closureDay = await this.findClosureDayOrFail(id, closureDayId);

    if (dto.closureDate && dto.closureDate !== closureDay.closureDate) {
      await this.ensureUniqueClosureDate(id, dto.closureDate, closureDay.id);
      closureDay.closureDate = dto.closureDate;
    }

    if (dto.reason !== undefined) {
      closureDay.reason = dto.reason ?? null;
    }

    if (dto.status !== undefined) {
      closureDay.status = dto.status;
    }

    const saved = await this.facilitiesRepository.saveClosureDay(closureDay);
    return this.toClosureDayResponse(saved);
  }

  // Xoa han record ngay dong cua neu admin nhap nham.
  async removeClosureDay(id: string, closureDayId: string) {
    await this.findById(id);
    const closureDay = await this.findClosureDayOrFail(id, closureDayId);
    await this.facilitiesRepository.removeClosureDay(closureDay);
    return this.toClosureDayResponse(closureDay);
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

  private ensureValidClosureDateRange(query?: SearchFacilityClosureDayDto): void {
    if (!query?.fromDate || !query?.toDate) return;

    if (query.fromDate > query.toDate) {
      throw new BadRequestException(RESPONSE_MESSAGES.FACILITIES.DATE_RANGE_INVALID);
    }
  }

  private async ensureUniqueClosureDate(
    facilityId: string,
    closureDate: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.facilitiesRepository.findClosureDayByDate(facilityId, closureDate);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.ALREADY_EXISTS,
        data: {
          duplicatedField: 'closureDate',
          duplicatedData: this.toClosureDayResponse(existing),
        },
      });
    }
  }

  private async findClosureDayOrFail(facilityId: string, closureDayId: string): Promise<FacilityClosureDay> {
    const closureDay = await this.facilitiesRepository.findClosureDayById(facilityId, closureDayId);
    if (!closureDay) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.NOT_FOUND);
    }
    return closureDay;
  }

  private toClosureDayResponse(closureDay: FacilityClosureDay) {
    return {
      id: closureDay.id,
      facilityId: closureDay.facilityId,
      closureDate: closureDay.closureDate,
      reason: closureDay.reason,
      status: closureDay.status,
    };
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

  private async generateFacilityCode(province: string): Promise<string> {
    const prefix = `CS-${this.buildProvinceAbbreviation(province)}`;
    const existingCodes = await this.facilitiesRepository.findCodesByPrefix(prefix);
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextSequence = existingCodes.reduce((maxSequence, code) => {
      const match = code.match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
      return match ? Math.max(maxSequence, Number(match[1])) : maxSequence;
    }, 0) + 1;

    return `${prefix}-${String(nextSequence).padStart(2, '0')}`;
  }

  private buildProvinceAbbreviation(province: string): string {
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

  private async attachFacilitySchedule(facility: FacilityWithDetails): Promise<FacilityWithDetails> {
    const [operatingHours, closureDays] = await Promise.all([
      this.getOperatingHoursOrDefault(facility),
      this.facilitiesRepository.findClosureDaysByFacilityId(facility.id),
    ]);
    const operatingState = this.buildCurrentOperatingState(facility, operatingHours, closureDays);

    return {
      ...facility,
      ...operatingState,
      operatingHours,
      operatingHourGroups: this.groupOperatingHoursForDisplay(operatingHours),
      closureDays,
    };
  }

  private async getOperatingHoursOrDefault(
    facility: Pick<Facility, 'id'>,
  ) {
    const operatingHours = await this.facilitiesRepository.findOperatingHoursByFacilityId(facility.id);
    if (operatingHours.length > 0) {
      return operatingHours.map(item => ({
        ...item,
        isClosed: Boolean(item.isClosed),
      }));
    }

    return this.buildDefaultOperatingHours();
  }

  private buildOperatingHoursForCreate(dto: CreateFacilityDto) {
    if (dto.schedules?.length) {
      return this.buildOperatingHoursFromGroupedSchedules(dto.schedules);
    }

    return this.buildDefaultOperatingHours();
  }

  private async buildOperatingHoursFromGroupedInput(
    facility: Pick<Facility, 'id'>,
    dto: UpdateFacilityOperatingHoursDto,
  ) {
    // Payload update được xem là cấu hình lịch tuần mới hoàn chỉnh.
    // Ngày nào FE không gửi sẽ tự rơi vào ngày nghỉ để DB vẫn luôn có đủ 7 ngày.
    return this.buildOperatingHoursFromGroupedSchedules(dto.schedules);
  }

  private buildDefaultOperatingHours() {
    return this.getOrderedDays().map(dayOfWeek => {
      const isSunday = dayOfWeek === FacilityDayOfWeek.SUN;
      return {
        dayOfWeek,
        openTime: isSunday ? null : '07:00:00',
        closeTime: isSunday ? null : '17:00:00',
        isClosed: isSunday,
      };
    });
  }

  private buildOperatingHoursFromGroupedSchedules(
    schedules: FacilityOperatingHourGroupDto[],
    baseOperatingHours?: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ) {
    const baseHours = baseOperatingHours ?? this.getOrderedDays().map(dayOfWeek => ({
      dayOfWeek,
      openTime: null,
      closeTime: null,
      isClosed: true,
    }));
    const byDay = new Map(baseHours.map(item => [item.dayOfWeek, item]));
    const seenDays = new Set<string>();

    for (const schedule of schedules) {
      for (const day of schedule.days) {
        if (seenDays.has(day)) {
          throw new BadRequestException({
            message: RESPONSE_MESSAGES.FACILITIES.SCHEDULE_DAY_DUPLICATED,
            data: {
              duplicatedField: 'days',
              duplicatedData: { dayOfWeek: day },
            },
          });
        }
        seenDays.add(day);

        const isClosed = schedule.isClosed === true;
        byDay.set(day, {
          dayOfWeek: day,
          openTime: isClosed ? null : (schedule.openTime ?? null),
          closeTime: isClosed ? null : (schedule.closeTime ?? null),
          isClosed,
        });
      }
    }

    return this.getOrderedDays().map(dayOfWeek => {
      const current = byDay.get(dayOfWeek);
      return {
        dayOfWeek,
        openTime: current?.openTime ?? null,
        closeTime: current?.closeTime ?? null,
        isClosed: current?.isClosed ?? true,
      };
    });
  }

  private async ensureOperatingHoursCompatibleWithUpcomingShifts(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): Promise<void> {
    const impactedShifts = await this.findOperatingHourImpactedShifts(facilityId, operatingHours);
    if (impactedShifts.length === 0) return;

    throw new ConflictException({
      message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_HAS_IMPACTED_SHIFTS,
      data: {
        duplicatedField: 'operatingHours',
        impactedShifts,
      },
    });
  }

  private async findOperatingHourImpactedShifts(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ) {
    const shifts = await this.facilitiesRepository.findActiveShiftsForOperatingHourValidation(
      facilityId,
      this.todayInVietnam(),
    );
    if (shifts.length === 0) return [];

    const operatingHoursByDay = new Map(operatingHours.map(item => [item.dayOfWeek, item]));
    const impactedShifts = [];
    for (const shift of shifts) {
      const dayOfWeek = this.getDayOfWeekFromDate(shift.shiftDate);
      const operatingHour = operatingHoursByDay.get(dayOfWeek);
      if (!operatingHour || operatingHour.isClosed || !operatingHour.openTime || !operatingHour.closeTime) {
        impactedShifts.push(this.toImpactedShiftData(
          shift,
          'Ngay nay dang bi cau hinh dong cua trong gio hoat dong moi',
        ));
        continue;
      }

      const normalizedStart = this.normalizeTime(shift.startTime);
      const normalizedEnd = this.normalizeTime(shift.endTime);
      const normalizedOpen = this.normalizeTime(String(operatingHour.openTime));
      const normalizedClose = this.normalizeTime(String(operatingHour.closeTime));

      if (isOvernightRange(normalizedStart, normalizedEnd)) {
        const nextDayOfWeek = this.getDayOfWeekFromDate(addDays(this.formatDateOnly(shift.shiftDate), 1));
        const nextOperatingHour = operatingHoursByDay.get(nextDayOfWeek);

        if (normalizedStart < normalizedOpen || normalizedClose < '23:59:00') {
          impactedShifts.push(this.toImpactedShiftData(
            shift,
            `Ca dem can ngay bat dau mo den 23:59, hien tai ${normalizedOpen} - ${normalizedClose}`,
          ));
          continue;
        }

        if (!nextOperatingHour || nextOperatingHour.isClosed || !nextOperatingHour.openTime || !nextOperatingHour.closeTime) {
          impactedShifts.push(this.toImpactedShiftData(
            shift,
            'Ca dem ket thuc vao ngay ke tiep nhung ngay ke tiep dang dong cua',
          ));
          continue;
        }

        const nextOpen = this.normalizeTime(String(nextOperatingHour.openTime));
        const nextClose = this.normalizeTime(String(nextOperatingHour.closeTime));
        if (nextOpen > '00:00:00' || normalizedEnd > nextClose) {
          impactedShifts.push(this.toImpactedShiftData(
            shift,
            `Ca dem can ngay ke tiep mo tu 00:00 den sau ${normalizedEnd}, hien tai ${nextOpen} - ${nextClose}`,
          ));
        }
        continue;
      }

      if (normalizedStart < normalizedOpen) {
        impactedShifts.push(this.toImpactedShiftData(
          shift,
          `Ca bat dau truoc gio mo cua moi ${normalizedOpen}`,
        ));
        continue;
      }

      if (normalizedEnd > normalizedClose) {
        impactedShifts.push(this.toImpactedShiftData(
          shift,
          `Ca ket thuc sau gio dong cua moi ${normalizedClose}`,
        ));
      }
    }

    return impactedShifts;
  }

  private toImpactedShiftData(shift: FacilityShiftScheduleViolation, reason?: string) {
    return {
      id: shift.id,
      shiftDate: this.formatDateOnly(shift.shiftDate),
      startTime: this.normalizeTime(shift.startTime),
      endTime: this.normalizeTime(shift.endTime),
      status: shift.status,
      doctorName: shift.doctorName ?? null,
      roomName: shift.roomName ?? null,
      slotName: shift.slotName ?? null,
      reason,
    };
  }

  private groupOperatingHoursForDisplay(
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ) {
    const orderedHours = this.getOrderedDays()
      .map(day => operatingHours.find(item => item.dayOfWeek === day))
      .filter((item): item is { dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean } => Boolean(item))
      .map(item => ({ ...item, isClosed: Boolean(item.isClosed) }));

    const groups: Array<{
      days: string[];
      dayLabel: string;
      openTime: string | null;
      closeTime: string | null;
      isClosed: boolean;
      displayTime: string;
    }> = [];

    for (const hour of orderedHours) {
      const lastGroup = groups[groups.length - 1];
      const hasSameTime = lastGroup
        && lastGroup.isClosed === hour.isClosed
        && lastGroup.openTime === hour.openTime
        && lastGroup.closeTime === hour.closeTime;

      if (hasSameTime) {
        lastGroup.days.push(hour.dayOfWeek);
        lastGroup.dayLabel = this.buildDayRangeLabel(lastGroup.days);
        continue;
      }

      groups.push({
        days: [hour.dayOfWeek],
        dayLabel: this.buildDayRangeLabel([hour.dayOfWeek]),
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed,
        displayTime: hour.isClosed ? 'Đóng cửa' : `${this.formatDisplayTime(hour.openTime)} - ${this.formatDisplayTime(hour.closeTime)}`,
      });
    }

    return groups;
  }

  private buildDayRangeLabel(days: string[]): string {
    if (days.length === 1) {
      return this.getVietnameseDayLabel(days[0]);
    }

    return `${this.getVietnameseDayLabel(days[0])} - ${this.getVietnameseDayLabel(days[days.length - 1])}`;
  }

  private getVietnameseDayLabel(day: string): string {
    const labels: Record<string, string> = {
      MON: 'Thứ 2',
      TUE: 'Thứ 3',
      WED: 'Thứ 4',
      THU: 'Thứ 5',
      FRI: 'Thứ 6',
      SAT: 'Thứ 7',
      SUN: 'Chủ nhật',
    };

    return labels[day] ?? day;
  }

  private formatDisplayTime(time: string | null): string {
    return time ? time.slice(0, 5) : '';
  }

  private buildCurrentOperatingState(
    facility: Pick<FacilityWithDetails, 'status'>,
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
    closureDays: Array<{ closureDate: string; status: string }>,
  ) {
    const vietnamNow = this.getVietnamNowParts();
    const todayOperatingHour = operatingHours.find(item => item.dayOfWeek === vietnamNow.dayOfWeek) ?? null;
    const isClosedByClosureDay = closureDays.some(item =>
      this.formatDateOnly(item.closureDate) === vietnamNow.date
      && item.status === ActiveStatus.ACTIVE,
    );

    if (facility.status !== FacilityStatus.ACTIVE) {
      return this.toOperatingState(FacilityOperatingStatus.INACTIVE, todayOperatingHour);
    }

    if (isClosedByClosureDay || !todayOperatingHour || todayOperatingHour.isClosed) {
      return this.toOperatingState(FacilityOperatingStatus.CLOSED_TODAY, todayOperatingHour);
    }

    const openSeconds = this.timeToSeconds(todayOperatingHour.openTime);
    const closeSeconds = this.timeToSeconds(todayOperatingHour.closeTime);
    if (openSeconds === null || closeSeconds === null) {
      return this.toOperatingState(FacilityOperatingStatus.CLOSED_TODAY, todayOperatingHour);
    }

    const isOpenNow = vietnamNow.seconds >= openSeconds && vietnamNow.seconds < closeSeconds;
    return this.toOperatingState(
      isOpenNow ? FacilityOperatingStatus.OPEN : FacilityOperatingStatus.CLOSED,
      todayOperatingHour,
    );
  }

  private toOperatingState(
    operatingStatus: FacilityOperatingStatus,
    todayOperatingHour: { dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean } | null,
  ) {
    return {
      operatingStatus,
      operatingStatusLabel: this.getOperatingStatusLabel(operatingStatus),
      isOpenNow: operatingStatus === FacilityOperatingStatus.OPEN,
      todayOperatingHour,
    };
  }

  private getOperatingStatusLabel(status: FacilityOperatingStatus): string {
    const labels: Record<FacilityOperatingStatus, string> = {
      [FacilityOperatingStatus.OPEN]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_OPEN,
      [FacilityOperatingStatus.CLOSED]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_CLOSED,
      [FacilityOperatingStatus.CLOSED_TODAY]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_CLOSED_TODAY,
      [FacilityOperatingStatus.INACTIVE]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_INACTIVE,
    };

    return labels[status];
  }

  private getVietnamNowParts(date = new Date()): {
    date: string;
    dayOfWeek: FacilityDayOfWeek;
    seconds: number;
  } {
    const vietnamDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = vietnamDate.getUTCFullYear();
    const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vietnamDate.getUTCDate()).padStart(2, '0');
    const hour = vietnamDate.getUTCHours();
    const minute = vietnamDate.getUTCMinutes();
    const second = vietnamDate.getUTCSeconds();

    return {
      date: `${year}-${month}-${day}`,
      dayOfWeek: this.getDayOfWeekFromUtcDay(vietnamDate.getUTCDay()),
      seconds: hour * 3600 + minute * 60 + second,
    };
  }

  private getDayOfWeekFromUtcDay(day: number): FacilityDayOfWeek {
    const days: Record<number, FacilityDayOfWeek> = {
      0: FacilityDayOfWeek.SUN,
      1: FacilityDayOfWeek.MON,
      2: FacilityDayOfWeek.TUE,
      3: FacilityDayOfWeek.WED,
      4: FacilityDayOfWeek.THU,
      5: FacilityDayOfWeek.FRI,
      6: FacilityDayOfWeek.SAT,
    };

    return days[day];
  }

  private timeToSeconds(time: string | null): number | null {
    if (!time) return null;

    const [hour = '0', minute = '0', second = '0'] = time.split(':');
    return Number(hour) * 3600 + Number(minute) * 60 + Number(second);
  }

  private formatDateOnly(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }

  private todayInVietnam(): string {
    return this.getVietnamNowParts().date;
  }

  private normalizeTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  private getDayOfWeekFromDate(value: string | Date): FacilityDayOfWeek {
    const dateOnly = this.formatDateOnly(value);
    const day = new Date(`${dateOnly}T00:00:00Z`).getUTCDay();
    return this.getDayOfWeekFromUtcDay(day);
  }

  private getOrderedDays(): FacilityDayOfWeek[] {
    return [
      FacilityDayOfWeek.MON,
      FacilityDayOfWeek.TUE,
      FacilityDayOfWeek.WED,
      FacilityDayOfWeek.THU,
      FacilityDayOfWeek.FRI,
      FacilityDayOfWeek.SAT,
      FacilityDayOfWeek.SUN,
    ];
  }


  
}
