import { DoctorShift } from '../entities/doctor-shifts.entity';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';

export interface ShiftConflicts {
  doctorConflicts: DoctorShift[];
  roomConflicts: DoctorShift[];
}