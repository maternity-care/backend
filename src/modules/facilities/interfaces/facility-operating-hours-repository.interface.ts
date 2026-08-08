import { FacilityDayOfWeek } from '../entities/facility-operating-hour.entity';
import { FacilityShiftScheduleViolation, FacilityShiftSlotScheduleViolation } from './facility-repository.interface';

export const FACILITY_OPERATING_HOURS_REPOSITORY = Symbol('FACILITY_OPERATING_HOURS_REPOSITORY');

export interface IFacilityOperatingHoursRepository {
  syncOperatingHours(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: FacilityDayOfWeek; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): Promise<void>;
  
  applyOperatingHours(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: FacilityDayOfWeek; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
    deactivateShiftSlotIds: string[],
  ): Promise<number>;
  
  findOperatingHoursByFacilityId(
    facilityId: string
  ): Promise<Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>>;
  
  findActiveShiftsForOperatingHourValidation(
    facilityId: string, 
    fromDate: string
  ): Promise<FacilityShiftScheduleViolation[]>;
  
  findActiveShiftSlotsForOperatingHourValidation(
    facilityId: string
  ): Promise<FacilityShiftSlotScheduleViolation[]>;
}
