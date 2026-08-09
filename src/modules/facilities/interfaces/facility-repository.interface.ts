import { DeepPartial } from 'typeorm';
import { Facility } from '../entities/facility.entity';
import { FacilityStatus } from '../../../common/constants/status.enum';
import { LookupFacilityDto, SearchFacilityDto } from '../dto/requests/search-facility.dto';
import { SearchFacilityAdminOptionsDto } from '../dto/requests/search-facility-admin-options.dto';
import {PaginationResult} from '../../../common/helpers/pagination';
import { FacilityLookupResponseDto, FacilityResponseDto } from '../dto/responds/facilities-respond';
export const FACILITIES_REPOSITORY = Symbol('FACILITIES_REPOSITORY');

export type FacilityWithDetails = FacilityResponseDto;
export type FacilityLookup = FacilityLookupResponseDto;

export interface FacilityAdminOption {
  id: string;
  name: string;
  email: string;
  personalEmail: string | null;
  phone: string;
  employeeCode: string;
  status: string;
  homeFacilityId: string | null;
  homeFacilityName: string | null;
  homeFacilityCode: string | null;
  roleId: string;
  roleName: string;
  ownedFacilityCount: number;
}

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

export interface FacilityShiftSlotScheduleViolation {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface FacilitySuspendImpact {
  affectedRooms: number;
  affectedShifts: number;
  affectedAppointments: number;
  suspendedRooms?: number;
  cancelledShifts?: number;
  reactivatedRooms?: number;
}

// truy cap db 
export interface IFacilitiesRepository {
  // tạo một facility
  create(data: DeepPartial<Facility>): Facility;
  //
  save(facility: Facility): Promise<Facility>;
  findAllPaginated(filters?: SearchFacilityDto): Promise<PaginationResult<FacilityWithDetails>>;
  findById(id: string): Promise<Facility | null>;
  findDetailsById(id: string): Promise<FacilityWithDetails | null>;
  findByCode(code: string): Promise<Facility | null>;
  findCodesByPrefix(prefix: string): Promise<string[]>;
  findByName(name: string): Promise<Facility | null>;
  findByEmail(email: string): Promise<Facility | null>;
  findByPhone(phone: string): Promise<Facility | null>;
  findAdminOptions(filters?: SearchFacilityAdminOptionsDto): Promise<PaginationResult<FacilityAdminOption>>;
  existsActiveOwner(ownerId: string): Promise<boolean>;
  lookup(filters?: LookupFacilityDto): Promise<FacilityLookup[]>;
  remove(facility: Facility): Promise<void>;
  countDependencies(facilityId: string): Promise<number>;
  softDelete(facility: Facility, reason?: string, deletedBy?: string | null): Promise<Facility>;
  updateStatus(id: string, status: FacilityStatus): Promise<Facility>;
}
