export interface ShiftConflictInput {
  doctorId: string;
  roomId?: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
}
