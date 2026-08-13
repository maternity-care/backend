import { DoctorShift } from '../entities/shift.entity';

export type WeeklyShiftUpdateAction = 'create' | 'update' | 'remove';

export interface WeeklyShiftUpdateBlockedItem {
  index: number;
  action: WeeklyShiftUpdateAction;
  shiftId?: string;
  shiftDate?: string;
  reason: string;
}

export interface WeeklyShiftUpdateResult {
  created: DoctorShift[];
  updated: DoctorShift[];
  unchanged: DoctorShift[];
  removedShiftIds: string[];
  blocked: WeeklyShiftUpdateBlockedItem[];
  summary: {
    created: number;
    updated: number;
    unchanged: number;
    removed: number;
    blocked: number;
  };
}
