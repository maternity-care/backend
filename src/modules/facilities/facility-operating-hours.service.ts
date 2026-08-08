import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FacilityOperatingHourGroupDto } from './dto/requests/facility-schedule.dto';
import { UpdateFacilityOperatingHoursDto } from './dto/requests/update-facility-operating-hours.dto';
import { ApplyFacilityOperatingHoursDto, OperatingHoursSlotStrategy } from './dto/requests/apply-facility-operating-hours.dto';
import { IFacilityOperatingHoursRepository, FACILITY_OPERATING_HOURS_REPOSITORY } from './interfaces/facility-operating-hours-repository.interface';
import { IFacilitiesRepository, FACILITIES_REPOSITORY } from './interfaces/facility-repository.interface';
import { FacilityShiftScheduleViolation, FacilityShiftSlotScheduleViolation } from './interfaces/facility-repository.interface';
import { FacilityDayOfWeek } from './entities/facility-operating-hour.entity';
import { ActiveStatus, FacilityOperatingStatus, FacilityStatus } from '../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { addDays, isOvernightRange } from '../shifts/helpers/shifts.helper';
import { FacilityWithDetails } from './interfaces/facility-repository.interface';
import { FacilityClosureDaysService } from './facility-closure-days.service';

@Injectable()
export class FacilityOperatingHoursService {
  constructor(
    @Inject(FACILITY_OPERATING_HOURS_REPOSITORY)
    private readonly operatingHoursRepository: IFacilityOperatingHoursRepository,
    @Inject(FACILITIES_REPOSITORY)
    private readonly facilitiesRepository: IFacilitiesRepository,
    private readonly closureDaysService: FacilityClosureDaysService,
  ) {}

  async getOperatingHours(id: string) {
    await this.ensureFacilityExists(id);
    const operatingHours = await this.getOperatingHoursOrDefault(id);

    return {
      operatingHours,
      operatingHourGroups: this.groupOperatingHoursForDisplay(operatingHours),
    };
  }

  async previewOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    await this.ensureFacilityExists(id);
    const operatingHours = await this.buildOperatingHoursFromGroupedInput(dto);
    const [impactedShifts, impactedShiftSlots] = await Promise.all([
      this.findOperatingHourImpactedShifts(id, operatingHours),
      this.findOperatingHourImpactedShiftSlots(id, operatingHours),
    ]);

    return {
      canUpdate: impactedShifts.length === 0 && impactedShiftSlots.length === 0,
      summary: {
        impactedShiftCount: impactedShifts.length,
        impactedShiftSlotCount: impactedShiftSlots.length,
      },
      operatingHours,
      operatingHourGroups: this.groupOperatingHoursForDisplay(operatingHours),
      impactedShifts,
      impactedShiftSlots,
    };
  }

  async updateOperatingHours(id: string, dto: UpdateFacilityOperatingHoursDto) {
    await this.ensureFacilityExists(id);
    const operatingHours = await this.buildOperatingHoursFromGroupedInput(dto);

    await this.ensureOperatingHoursCompatibleWithUpcomingShifts(id, operatingHours);
    await this.operatingHoursRepository.syncOperatingHours(id, operatingHours);
    return this.getOperatingHours(id);
  }

  async applyOperatingHours(id: string, dto: ApplyFacilityOperatingHoursDto) {
    await this.ensureFacilityExists(id);
    const operatingHours = await this.buildOperatingHoursFromGroupedInput(dto);
    const slotStrategy = dto.slotStrategy ?? OperatingHoursSlotStrategy.STRICT;
    const [impactedShifts, impactedShiftSlots] = await Promise.all([
      this.findOperatingHourImpactedShifts(id, operatingHours),
      this.findOperatingHourImpactedShiftSlots(id, operatingHours),
    ]);

    if (impactedShifts.length > 0) {
      this.throwOperatingHoursImpactConflict(impactedShifts, impactedShiftSlots);
    }

    if (impactedShiftSlots.length > 0 && slotStrategy === OperatingHoursSlotStrategy.STRICT) {
      this.throwOperatingHoursImpactConflict(impactedShifts, impactedShiftSlots);
    }

    const deactivateShiftSlotIds = slotStrategy === OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS
      ? impactedShiftSlots.map(slot => slot.id)
      : [];
    const deactivatedShiftSlotCount = await this.operatingHoursRepository.applyOperatingHours(
      id,
      operatingHours,
      deactivateShiftSlotIds,
    );
    const savedOperatingHours = await this.getOperatingHours(id);

    return {
      ...savedOperatingHours,
      slotStrategy,
      summary: {
        impactedShiftCount: impactedShifts.length,
        impactedShiftSlotCount: impactedShiftSlots.length,
        deactivatedShiftSlotCount,
      },
      impactedShifts,
      impactedShiftSlots,
    };
  }

  async attachFacilitySchedule(facility: FacilityWithDetails): Promise<FacilityWithDetails> {
    const [operatingHours, closureDays] = await Promise.all([
      this.getOperatingHoursOrDefault(facility.id),
      this.closureDaysService.getClosureDaysInternal(facility.id),
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

  buildOperatingHoursForCreate(schedules?: FacilityOperatingHourGroupDto[]) {
    if (schedules?.length) {
      return this.buildOperatingHoursFromGroupedSchedules(schedules);
    }
    return this.buildDefaultOperatingHours();
  }

  private async ensureFacilityExists(id: string): Promise<void> {
    const facility = await this.facilitiesRepository.findById(id);
    if (!facility) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
  }

  private async getOperatingHoursOrDefault(facilityId: string) {
    const operatingHours = await this.operatingHoursRepository.findOperatingHoursByFacilityId(facilityId);
    if (operatingHours.length > 0) {
      return operatingHours.map(item => ({
        ...item,
        isClosed: Boolean(item.isClosed),
      }));
    }
    return this.buildDefaultOperatingHours();
  }

  private async buildOperatingHoursFromGroupedInput(dto: UpdateFacilityOperatingHoursDto) {
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
    const [impactedShifts, impactedShiftSlots] = await Promise.all([
      this.findOperatingHourImpactedShifts(facilityId, operatingHours),
      this.findOperatingHourImpactedShiftSlots(facilityId, operatingHours),
    ]);
    if (impactedShifts.length === 0 && impactedShiftSlots.length === 0) return;

    this.throwOperatingHoursImpactConflict(impactedShifts, impactedShiftSlots);
  }

  private throwOperatingHoursImpactConflict(
    impactedShifts: ReturnType<typeof this.toImpactedShiftData>[],
    impactedShiftSlots: ReturnType<typeof this.toImpactedShiftSlotData>[],
  ): never {
    throw new ConflictException({
      message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_HAS_IMPACTED_SHIFTS,
      data: {
        duplicatedField: 'operatingHours',
        impactedShifts,
        impactedShiftSlots,
      },
    });
  }

  private async findOperatingHourImpactedShifts(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ) {
    const shifts = await this.operatingHoursRepository.findActiveShiftsForOperatingHourValidation(
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
        const nextDate = addDays(this.formatDateOnly(shift.shiftDate), 1);
        const nextDayOfWeek = this.getDayOfWeekFromDate(nextDate);
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

  private async findOperatingHourImpactedShiftSlots(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ) {
    const slots = await this.operatingHoursRepository.findActiveShiftSlotsForOperatingHourValidation(facilityId);
    if (slots.length === 0) return [];

    const openOperatingHours = operatingHours.filter(item =>
      !item.isClosed && item.openTime && item.closeTime,
    );
    if (openOperatingHours.length === 0) {
      return slots.map(slot => this.toImpactedShiftSlotData(
        slot,
        'Co so khong con ngay mo cua nao cho khung ca active',
      ));
    }

    return slots
      .map(slot => {
        const invalidDays = this.findInvalidOperatingDaysForShiftSlot(slot, operatingHours);
        if (invalidDays.length === 0) return null;
        return this.toImpactedShiftSlotData(
          slot,
          `Khung ca khong nam trong gio mo cua moi cua: ${invalidDays.join(', ')}`,
        );
      })
      .filter((item): item is ReturnType<typeof this.toImpactedShiftSlotData> => Boolean(item));
  }

  private findInvalidOperatingDaysForShiftSlot(
    slot: FacilityShiftSlotScheduleViolation,
    operatingHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): string[] {
    const invalidDays: string[] = [];
    const normalizedStart = this.normalizeTime(slot.startTime);
    const normalizedEnd = this.normalizeTime(slot.endTime);
    const isOvernight = isOvernightRange(normalizedStart, normalizedEnd);

    for (let index = 0; index < operatingHours.length; index += 1) {
      const operatingHour = operatingHours[index];
      if (operatingHour.isClosed || !operatingHour.openTime || !operatingHour.closeTime) continue;

      const normalizedOpen = this.normalizeTime(String(operatingHour.openTime));
      const normalizedClose = this.normalizeTime(String(operatingHour.closeTime));
      if (!isOvernight) {
        if (normalizedStart < normalizedOpen || normalizedEnd > normalizedClose) {
          invalidDays.push(this.getVietnameseDayLabel(operatingHour.dayOfWeek));
        }
        continue;
      }

      const nextOperatingHour = operatingHours[(index + 1) % operatingHours.length];
      const nextOpen = nextOperatingHour?.openTime ? this.normalizeTime(String(nextOperatingHour.openTime)) : null;
      const nextClose = nextOperatingHour?.closeTime ? this.normalizeTime(String(nextOperatingHour.closeTime)) : null;
      const currentDayInvalid = normalizedStart < normalizedOpen || normalizedClose < '23:59:00';
      const nextDayInvalid = !nextOperatingHour
        || nextOperatingHour.isClosed
        || !nextOpen
        || !nextClose
        || nextOpen > '00:00:00'
        || normalizedEnd > nextClose;

      if (currentDayInvalid || nextDayInvalid) {
        invalidDays.push(this.getVietnameseDayLabel(operatingHour.dayOfWeek));
      }
    }

    return invalidDays;
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

  private toImpactedShiftSlotData(slot: FacilityShiftSlotScheduleViolation, reason?: string) {
    return {
      id: slot.id,
      name: slot.name,
      code: slot.code,
      startTime: this.normalizeTime(slot.startTime),
      endTime: this.normalizeTime(slot.endTime),
      status: slot.status,
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
