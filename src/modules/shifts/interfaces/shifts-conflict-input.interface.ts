export interface ShiftConflictInput {
  doctorId?: string;
  staffId?: string;
  roleId?: string | null;
  roleName?: string | null;
  slotId?: string | null;
  roomId?: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
}
