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

/** Candidate da duoc validator chuan hoa, dung de kiem tra nhieu xung dot trong mot lan doc DB. */
export interface BatchShiftConflictInput extends ShiftConflictInput {
  index: number;
  facilityId: string;
}
