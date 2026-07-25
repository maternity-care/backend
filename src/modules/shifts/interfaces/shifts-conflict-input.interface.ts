export interface ShiftConflictInput {
  doctorId: string;
  staffId?: string;
  slotId?: string | null;
  roomId?: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
}
