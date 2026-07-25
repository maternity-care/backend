import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { Shift } from '../entities/shift.entity';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';
import { ShiftConflicts } from './shift-conflicts.interface';
import { ShiftConflictInput } from './shifts-conflict-input.interface';
import { DoctorAppointmentBlock } from './doctor-appointment-block.interface';
import { DoctorShiftResponseDto } from '../dto/responses/doctor-shift-response.dto';

export const DOCTOR_SHIFTS_REPOSITORY = Symbol('DOCTOR_SHIFTS_REPOSITORY');

export type DoctorShiftWithDetails = DoctorShiftResponseDto;

export interface IDoctorShiftsRepository {
  create(data: DeepPartial<Shift>): Shift;
  insertMonthlyShifts(shifts: DeepPartial<Shift>[]): Promise<Shift[]>;
  saveMany(shifts: DeepPartial<Shift>[]): Promise<Shift[]>;
  save(shift: Shift): Promise<Shift>;
  remove(shift: Shift): Promise<void>;
  findById(id: string): Promise<Shift | null>;
  findDetailsById(id: string): Promise<DoctorShiftWithDetails | null>;
  findAll(filters?: SearchDoctorShiftDto): Promise<DoctorShiftWithDetails[]>;
  findAllPaginated(
    filters?: SearchDoctorShiftDto,
  ): Promise<PaginationResult<DoctorShiftWithDetails>>;
  findConflicts(input: ShiftConflictInput): Promise<ShiftConflicts>;
  findWeekly(
    facilityId: string,
    startDate: string,
    endDate: string,
    doctorId?: string,
  ): Promise<Shift[]>;
  findWeeklyWithDetails(
    facilityId: string,
    startDate: string,
    endDate: string,
    doctorId?: string,
  ): Promise<DoctorShiftWithDetails[]>;
  findDoctorShiftsForDate(facilityId: string, doctorId: string, date: string): Promise<Shift[]>;
  findDoctorAppointmentsForDate(
    facilityId: string,
    doctorId: string,
    date: string,
  ): Promise<DoctorAppointmentBlock[]>;
  findAppointmentsForShift(shift: Shift, activeOnly?: boolean): Promise<DoctorAppointmentBlock[]>;
  cancelShiftWithDisruption(
    shift: Shift,
    affectedAppointments: DoctorAppointmentBlock[],
    reason?: string,
    changedBy?: string | null,
  ): Promise<{ shift: Shift; disruptionId?: string }>;
  isDoctorAssignedToFacility(doctorId: string, facilityId: string): Promise<boolean>;
}
