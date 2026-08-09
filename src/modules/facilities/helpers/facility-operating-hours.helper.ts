import { BadRequestException } from '@nestjs/common';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';
import { FacilityOperatingStatus, FacilityStatus } from '../../../common/constants/status.enum';
import { FacilityOperatingHourGroupDto } from '../dto/requests/facility-schedule.dto';
import { FacilityDayOfWeek } from '../entities/facility-operating-hour.entity';
import { FacilityWithDetails } from '../interfaces/facility-repository.interface';

//tạo interface cho operating hour
export interface FacilityOperatingHourLike {
  dayOfWeek: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

// gọi enum facility day of week
export const ORDERED_FACILITY_DAYS: FacilityDayOfWeek[] = [
  FacilityDayOfWeek.MON,
  FacilityDayOfWeek.TUE,
  FacilityDayOfWeek.WED,
  FacilityDayOfWeek.THU,
  FacilityDayOfWeek.FRI,
  FacilityDayOfWeek.SAT,
  FacilityDayOfWeek.SUN,
];

// tạo operating hour mặc định cho facility
export function buildDefaultOperatingHours(): FacilityOperatingHourLike[] {
  return ORDERED_FACILITY_DAYS.map(dayOfWeek => {
    const isSunday = dayOfWeek === FacilityDayOfWeek.SUN;
    return {
      dayOfWeek,
      openTime: isSunday ? null : '07:00:00',
      closeTime: isSunday ? null : '17:00:00',
      isClosed: isSunday,
    };
  });
}

// tạo operating hour mặc định cho facility được nhóm lại
export function buildOperatingHoursFromGroupedSchedules(
  schedules: FacilityOperatingHourGroupDto[],
  baseOperatingHours?: FacilityOperatingHourLike[],
): FacilityOperatingHourLike[] {
  const baseHours = baseOperatingHours ?? ORDERED_FACILITY_DAYS.map(dayOfWeek => ({
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

  return ORDERED_FACILITY_DAYS.map(dayOfWeek => {
    const current = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      openTime: current?.openTime ?? null,
      closeTime: current?.closeTime ?? null,
      isClosed: current?.isClosed ?? true,
    };
  });
}

export function groupOperatingHoursForDisplay(operatingHours: FacilityOperatingHourLike[]) {
  const orderedHours = ORDERED_FACILITY_DAYS
    .map(day => operatingHours.find(item => item.dayOfWeek === day))
    .filter((item): item is FacilityOperatingHourLike => Boolean(item))
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
      lastGroup.dayLabel = buildDayRangeLabel(lastGroup.days);
      continue;
    }

    groups.push({
      days: [hour.dayOfWeek],
      dayLabel: buildDayRangeLabel([hour.dayOfWeek]),
      openTime: hour.openTime,
      closeTime: hour.closeTime,
      isClosed: hour.isClosed,
      displayTime: hour.isClosed ? 'Đóng cửa' : `${formatDisplayTime(hour.openTime)} - ${formatDisplayTime(hour.closeTime)}`,
    });
  }

  return groups;
}

export function buildCurrentOperatingState(
  facility: Pick<FacilityWithDetails, 'status'>,
  operatingHours: FacilityOperatingHourLike[],
) {
  const vietnamNow = getVietnamNowParts();
  const todayOperatingHour = operatingHours.find(item => item.dayOfWeek === vietnamNow.dayOfWeek) ?? null;

  if (facility.status !== FacilityStatus.ACTIVE) {
    return toOperatingState(FacilityOperatingStatus.INACTIVE, todayOperatingHour);
  }

  if (!todayOperatingHour || todayOperatingHour.isClosed) {
    return toOperatingState(FacilityOperatingStatus.CLOSED_TODAY, todayOperatingHour);
  }

  const openSeconds = timeToSeconds(todayOperatingHour.openTime);
  const closeSeconds = timeToSeconds(todayOperatingHour.closeTime);
  if (openSeconds === null || closeSeconds === null) {
    return toOperatingState(FacilityOperatingStatus.CLOSED_TODAY, todayOperatingHour);
  }

  const isOpenNow = vietnamNow.seconds >= openSeconds && vietnamNow.seconds < closeSeconds;
  return toOperatingState(
    isOpenNow ? FacilityOperatingStatus.OPEN : FacilityOperatingStatus.CLOSED,
    todayOperatingHour,
  );
}

export function todayInVietnam(): string {
  return getVietnamNowParts().date;
}

export function formatDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export function getDayOfWeekFromDate(value: string | Date): FacilityDayOfWeek {
  const dateOnly = formatDateOnly(value);
  const day = new Date(`${dateOnly}T00:00:00Z`).getUTCDay();
  return getDayOfWeekFromUtcDay(day);
}

export function getVietnameseDayLabel(day: string): string {
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

function buildDayRangeLabel(days: string[]): string {
  if (days.length === 1) {
    return getVietnameseDayLabel(days[0]);
  }
  return `${getVietnameseDayLabel(days[0])} - ${getVietnameseDayLabel(days[days.length - 1])}`;
}

function formatDisplayTime(time: string | null): string {
  return time ? time.slice(0, 5) : '';
}

function toOperatingState(
  operatingStatus: FacilityOperatingStatus,
  todayOperatingHour: FacilityOperatingHourLike | null,
) {
  return {
    operatingStatus,
    operatingStatusLabel: getOperatingStatusLabel(operatingStatus),
    isOpenNow: operatingStatus === FacilityOperatingStatus.OPEN,
    todayOperatingHour,
  };
}

function getOperatingStatusLabel(status: FacilityOperatingStatus): string {
  const labels: Record<FacilityOperatingStatus, string> = {
    [FacilityOperatingStatus.OPEN]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_OPEN,
    [FacilityOperatingStatus.CLOSED]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_CLOSED,
    [FacilityOperatingStatus.CLOSED_TODAY]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_CLOSED_TODAY,
    [FacilityOperatingStatus.INACTIVE]: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_INACTIVE,
  };
  return labels[status];
}

function getVietnamNowParts(date = new Date()): {
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
    dayOfWeek: getDayOfWeekFromUtcDay(vietnamDate.getUTCDay()),
    seconds: hour * 3600 + minute * 60 + second,
  };
}

function getDayOfWeekFromUtcDay(day: number): FacilityDayOfWeek {
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

function timeToSeconds(time: string | null): number | null {
  if (!time) return null;
  const [hour = '0', minute = '0', second = '0'] = time.split(':');
  return Number(hour) * 3600 + Number(minute) * 60 + Number(second);
}
