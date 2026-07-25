import { Shift } from '../entities/shift.entity';

export interface ShiftConflicts {
  doctorConflicts: Shift[];
  roomConflicts: Shift[];
}