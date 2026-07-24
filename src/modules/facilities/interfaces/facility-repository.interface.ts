import { DeepPartial } from 'typeorm';
import { Facility } from '../entities/facility.entity';
import { FacilityClosureDay } from '../entities/facility-closure-day.entity';
import { FacilityDayOfWeek } from '../entities/facility-operating-hour.entity';
import { FacilityStatus } from '../../../common/constants/status.enum';
import { SearchFacilityClosureDayDto } from '../dto/requests/facility-closure-day.dto';
import { LookupFacilityDto, SearchFacilityDto } from '../dto/requests/search-facility.dto';
import {PaginationResult} from '../../../common/helpers/pagination';
import { FacilityLookupResponseDto, FacilityResponseDto } from '../dto/responds/facilities-respond';
export const FACILITIES_REPOSITORY = Symbol('FACILITIES_REPOSITORY');

export type FacilityWithDetails = FacilityResponseDto;
export type FacilityLookup = FacilityLookupResponseDto;

export interface FacilityShiftScheduleViolation {
  id: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: string;
  doctorName?: string | null;
  roomName?: string | null;
  slotName?: string | null;
}

// truy cap db 
export interface IFacilitiesRepository {
  // tạo một facility
  create(data: DeepPartial<Facility>): Facility;
  //
  save(facility: Facility): Promise<Facility>;
  syncOperatingHours(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: FacilityDayOfWeek; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): Promise<void>;
  findOperatingHoursByFacilityId(facilityId: string): Promise<Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>>;
  findActiveShiftsForOperatingHourValidation(facilityId: string, fromDate: string): Promise<FacilityShiftScheduleViolation[]>;
  createClosureDay(data: DeepPartial<FacilityClosureDay>): FacilityClosureDay;
  saveClosureDay(closureDay: FacilityClosureDay): Promise<FacilityClosureDay>;
  removeClosureDay(closureDay: FacilityClosureDay): Promise<void>;
  findClosureDaysByFacilityId(facilityId: string, filters?: SearchFacilityClosureDayDto): Promise<Array<{ id: string; facilityId: string; closureDate: string; reason: string | null; status: string }>>;
  findClosureDayById(facilityId: string, closureDayId: string): Promise<FacilityClosureDay | null>;
  findClosureDayByDate(facilityId: string, closureDate: string): Promise<FacilityClosureDay | null>;
  findAll(filters?: SearchFacilityDto): Promise<FacilityWithDetails[]>;
  findAllPaginated?(filters?: SearchFacilityDto): Promise<PaginationResult<FacilityWithDetails>>;
  findById(id: string): Promise<Facility | null>;
  findDetailsById(id: string): Promise<FacilityWithDetails | null>;
  findByCode(code: string): Promise<Facility | null>;
  findCodesByPrefix(prefix: string): Promise<string[]>;
  findByName(name: string): Promise<Facility | null>;
  findByEmail(email: string): Promise<Facility | null>;
  findByPhone(phone: string): Promise<Facility | null>;
  existsActiveOwner(ownerId: string): Promise<boolean>;
  lookup(filters?: LookupFacilityDto): Promise<FacilityLookup[]>;
  remove(facility: Facility): Promise<void>;
  countDependencies(facilityId: string): Promise<number>;
  softDelete(facility: Facility, reason?: string, deletedBy?: string | null): Promise<Facility>;
  updateStatus(id: string, status: FacilityStatus): Promise<Facility>;
  deActivateFacility(id: string): Promise<Facility>;
}
