import { DoctorShift } from '../entities/shift.entity';
import { ShiftUpdateChanges } from '../interfaces/shift-update.interface';

/**
 * Phân loại thay đổi để service áp dụng đúng luật cho ca đã có lịch hẹn.
 * Hàm này không truy cập DB và không quyết định thay đổi có hợp lệ hay không.
 */
export function detectShiftUpdateChanges(
  before: DoctorShift,
  after: DoctorShift,
): ShiftUpdateChanges {
  return {
    assigneeChanged: before.staffId !== after.staffId,
    roomChanged: normalizeNullable(before.roomId) !== normalizeNullable(after.roomId),
    scheduleChanged:
      before.facilityId !== after.facilityId
      || normalizeDate(before.shiftDate) !== normalizeDate(after.shiftDate)
      || normalizeNullable(before.slotId) !== normalizeNullable(after.slotId)
      || normalizeTime(before.startTime) !== normalizeTime(after.startTime)
      || normalizeTime(before.endTime) !== normalizeTime(after.endTime),
    roleChanged: normalizeNullable(before.roleId) !== normalizeNullable(after.roleId),
    capacityChanged: before.maxAppointments !== after.maxAppointments,
    statusChanged: before.status !== after.status,
    noteChanged: before.note !== after.note,
  };
}

function normalizeNullable(value: unknown): string | null {
  return value === undefined || value === null || value === '' ? null : String(value);
}

function normalizeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function normalizeTime(value: string): string {
  return String(value).slice(0, 5);
}

export function hasMeaningfulShiftChanges(changes: ShiftUpdateChanges): boolean {
  return Object.values(changes).some(Boolean);
}
