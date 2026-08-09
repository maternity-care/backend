import { addDays, isOvernightRange } from '../../shifts/helpers/shifts.helper';
import {
  FacilityShiftScheduleViolation,
  FacilityShiftSlotScheduleViolation,
} from '../interfaces/facility-repository.interface';
import {
  FacilityOperatingHourLike,
  formatDateOnly,
  getDayOfWeekFromDate,
  getVietnameseDayLabel,
  normalizeTime,
} from '../helpers/facility-operating-hours.helper';

export interface ImpactedShiftData {
  id: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: string;
  doctorName: string | null;
  roomName: string | null;
  slotName: string | null;
  reason?: string;
}

export interface ImpactedShiftSlotData {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  status: string;
  reason?: string;
}

export function findImpactedShiftsByOperatingHours(
  shifts: FacilityShiftScheduleViolation[],
  operatingHours: FacilityOperatingHourLike[],
): ImpactedShiftData[] {
  if (shifts.length === 0) return [];

  const operatingHoursByDay = new Map(operatingHours.map(item => [item.dayOfWeek, item]));
  const impactedShifts: ImpactedShiftData[] = [];
  for (const shift of shifts) {
    const dayOfWeek = getDayOfWeekFromDate(shift.shiftDate);
    const operatingHour = operatingHoursByDay.get(dayOfWeek);
    if (!operatingHour || operatingHour.isClosed || !operatingHour.openTime || !operatingHour.closeTime) {
      impactedShifts.push(toImpactedShiftData(
        shift,
        'Ngay nay dang bi cau hinh dong cua trong gio hoat dong moi',
      ));
      continue;
    }

    const normalizedStart = normalizeTime(shift.startTime);
    const normalizedEnd = normalizeTime(shift.endTime);
    const normalizedOpen = normalizeTime(String(operatingHour.openTime));
    const normalizedClose = normalizeTime(String(operatingHour.closeTime));

    if (isOvernightRange(normalizedStart, normalizedEnd)) {
      const nextDate = addDays(formatDateOnly(shift.shiftDate), 1);
      const nextDayOfWeek = getDayOfWeekFromDate(nextDate);
      const nextOperatingHour = operatingHoursByDay.get(nextDayOfWeek);

      if (normalizedStart < normalizedOpen || normalizedClose < '23:59:00') {
        impactedShifts.push(toImpactedShiftData(
          shift,
          `Ca dem can ngay bat dau mo den 23:59, hien tai ${normalizedOpen} - ${normalizedClose}`,
        ));
        continue;
      }

      if (!nextOperatingHour || nextOperatingHour.isClosed || !nextOperatingHour.openTime || !nextOperatingHour.closeTime) {
        impactedShifts.push(toImpactedShiftData(
          shift,
          'Ca dem ket thuc vao ngay ke tiep nhung ngay ke tiep dang dong cua',
        ));
        continue;
      }

      const nextOpen = normalizeTime(String(nextOperatingHour.openTime));
      const nextClose = normalizeTime(String(nextOperatingHour.closeTime));
      if (nextOpen > '00:00:00' || normalizedEnd > nextClose) {
        impactedShifts.push(toImpactedShiftData(
          shift,
          `Ca dem can ngay ke tiep mo tu 00:00 den sau ${normalizedEnd}, hien tai ${nextOpen} - ${nextClose}`,
        ));
      }
      continue;
    }

    if (normalizedStart < normalizedOpen) {
      impactedShifts.push(toImpactedShiftData(
        shift,
        `Ca bat dau truoc gio mo cua moi ${normalizedOpen}`,
      ));
      continue;
    }

    if (normalizedEnd > normalizedClose) {
      impactedShifts.push(toImpactedShiftData(
        shift,
        `Ca ket thuc sau gio dong cua moi ${normalizedClose}`,
      ));
    }
  }

  return impactedShifts;
}

export function findImpactedShiftSlotsByOperatingHours(
  slots: FacilityShiftSlotScheduleViolation[],
  operatingHours: FacilityOperatingHourLike[],
): ImpactedShiftSlotData[] {
  if (slots.length === 0) return [];

  const openOperatingHours = operatingHours.filter(item =>
    !item.isClosed && item.openTime && item.closeTime,
  );
  if (openOperatingHours.length === 0) {
    return slots.map(slot => toImpactedShiftSlotData(
      slot,
      'Co so khong con ngay mo cua nao cho khung ca active',
    ));
  }

  return slots
    .map(slot => {
      const invalidDays = findInvalidOperatingDaysForShiftSlot(slot, operatingHours);
      if (invalidDays.length === 0) return null;
      return toImpactedShiftSlotData(
        slot,
        `Khung ca khong nam trong gio mo cua moi cua: ${invalidDays.join(', ')}`,
      );
    })
    .filter((item): item is ImpactedShiftSlotData => Boolean(item));
}

function findInvalidOperatingDaysForShiftSlot(
  slot: FacilityShiftSlotScheduleViolation,
  operatingHours: FacilityOperatingHourLike[],
): string[] {
  const invalidDays: string[] = [];
  const normalizedStart = normalizeTime(slot.startTime);
  const normalizedEnd = normalizeTime(slot.endTime);
  const isOvernight = isOvernightRange(normalizedStart, normalizedEnd);

  for (let index = 0; index < operatingHours.length; index += 1) {
    const operatingHour = operatingHours[index];
    if (operatingHour.isClosed || !operatingHour.openTime || !operatingHour.closeTime) continue;

    const normalizedOpen = normalizeTime(String(operatingHour.openTime));
    const normalizedClose = normalizeTime(String(operatingHour.closeTime));
    if (!isOvernight) {
      if (normalizedStart < normalizedOpen || normalizedEnd > normalizedClose) {
        invalidDays.push(getVietnameseDayLabel(operatingHour.dayOfWeek));
      }
      continue;
    }

    const nextOperatingHour = operatingHours[(index + 1) % operatingHours.length];
    const nextOpen = nextOperatingHour?.openTime ? normalizeTime(String(nextOperatingHour.openTime)) : null;
    const nextClose = nextOperatingHour?.closeTime ? normalizeTime(String(nextOperatingHour.closeTime)) : null;
    const currentDayInvalid = normalizedStart < normalizedOpen || normalizedClose < '23:59:00';
    const nextDayInvalid = !nextOperatingHour
      || nextOperatingHour.isClosed
      || !nextOpen
      || !nextClose
      || nextOpen > '00:00:00'
      || normalizedEnd > nextClose;

    if (currentDayInvalid || nextDayInvalid) {
      invalidDays.push(getVietnameseDayLabel(operatingHour.dayOfWeek));
    }
  }

  return invalidDays;
}

function toImpactedShiftData(shift: FacilityShiftScheduleViolation, reason?: string): ImpactedShiftData {
  return {
    id: shift.id,
    shiftDate: formatDateOnly(shift.shiftDate),
    startTime: normalizeTime(shift.startTime),
    endTime: normalizeTime(shift.endTime),
    status: shift.status,
    doctorName: shift.doctorName ?? null,
    roomName: shift.roomName ?? null,
    slotName: shift.slotName ?? null,
    reason,
  };
}

function toImpactedShiftSlotData(slot: FacilityShiftSlotScheduleViolation, reason?: string): ImpactedShiftSlotData {
  return {
    id: slot.id,
    name: slot.name,
    code: slot.code,
    startTime: normalizeTime(slot.startTime),
    endTime: normalizeTime(slot.endTime),
    status: slot.status,
    reason,
  };
}
