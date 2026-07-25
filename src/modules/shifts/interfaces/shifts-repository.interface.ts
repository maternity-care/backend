import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { Shift } from '../entities/shift.entity';
import { SearchDoctorShiftDto } from '../dto/requests/search-doctor-shift.dto';
import { ShiftConflicts } from './shift-conflicts.interface';
import { ShiftConflictInput } from './shifts-conflict-input.interface';
import { DoctorAppointmentBlock } from './doctor-appointment-block.interface';
import { DoctorShiftResponseDto } from '../dto/responses/doctor-shift-response.dto';
import { ShiftSlot } from '../../../database/entities/shift-slot.entity';

export const SHIFTS_REPOSITORY = Symbol('SHIFTS_REPOSITORY');

export type ShiftWithDetails = DoctorShiftResponseDto;

export interface IShiftsRepository {
  create(data: DeepPartial<Shift>): Shift;
  insertMonthlyShifts(shifts: DeepPartial<Shift>[]): Promise<Shift[]>;
  saveMany(shifts: DeepPartial<Shift>[]): Promise<Shift[]>;
  save(shift: Shift): Promise<Shift>;
  remove(shift: Shift): Promise<void>;
  findById(id: string): Promise<Shift | null>;
  findDetailsById(id: string): Promise<ShiftWithDetails | null>;
  findAll(filters?: SearchDoctorShiftDto): Promise<ShiftWithDetails[]>;
  findAllPaginated(filters?: SearchDoctorShiftDto): Promise<PaginationResult<ShiftWithDetails>>;
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
  ): Promise<ShiftWithDetails[]>;
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
  findDoctorStaffId(doctorId: string, facilityId?: string): Promise<string | null>;
  findDoctorIdByStaffId(staffId: string, facilityId?: string): Promise<string | null>;
  findShiftSlotById(slotId: string): Promise<ShiftSlot | null>;
}
