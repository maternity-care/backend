import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { DoctorShift } from '../entities/doctor-shifts.entity';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';
import { ShiftConflicts } from './shift-conflicts.interface';
import { ShiftConflictInput } from './shifts-conflict-input.interface';
import { DoctorAppointmentBlock } from './doctor-appointment-block.interface';

export const DOCTOR_SHIFTS_REPOSITORY = Symbol('DOCTOR_SHIFTS_REPOSITORY');


export interface IDoctorShiftsRepository {
  create(data: DeepPartial<DoctorShift>): DoctorShift;
  insertMonthlyShifts(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]>;
  saveMany(shifts: DeepPartial<DoctorShift>[]): Promise<DoctorShift[]>;
  save(shift: DoctorShift): Promise<DoctorShift>;
  remove(shift: DoctorShift): Promise<void>;
  findById(id: string): Promise<DoctorShift | null>;
  findAll(filters?: SearchDoctorShiftDto): Promise<DoctorShift[]>;
  findAllPaginated(filters?: SearchDoctorShiftDto): Promise<PaginationResult<DoctorShift>>;
  findConflicts(input: ShiftConflictInput): Promise<ShiftConflicts>;
  findWeekly(facilityId: string, startDate: string, endDate: string, doctorId?: string): Promise<DoctorShift[]>;
  findDoctorShiftsForDate(facilityId: string, doctorId: string, date: string): Promise<DoctorShift[]>;
  findDoctorAppointmentsForDate(facilityId: string, doctorId: string, date: string): Promise<DoctorAppointmentBlock[]>;
  findAppointmentsForShift(shift: DoctorShift, activeOnly?: boolean): Promise<DoctorAppointmentBlock[]>;
  cancelShiftWithDisruption(
    shift: DoctorShift,
    affectedAppointments: DoctorAppointmentBlock[],
    reason?: string,
    changedBy?: string | null,
  ): Promise<{ shift: DoctorShift; disruptionId?: string }>;
  isDoctorAssignedToFacility(doctorId: string, facilityId: string): Promise<boolean>;

}
