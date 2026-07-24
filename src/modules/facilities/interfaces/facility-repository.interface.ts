import { DeepPartial } from 'typeorm';
import { Facility } from '../entities/facility.entity';
import { FacilityStatus } from '../../../common/constants/status.enum';
import { LookupFacilityDto, SearchFacilityDto } from '../dto/requests/search-facility.dto';
import {PaginationResult} from '../../../common/helpers/pagination';
import { FacilityLookupResponseDto, FacilityResponseDto } from '../dto/responds/facilities-respond';
export const FACILITIES_REPOSITORY = Symbol('FACILITIES_REPOSITORY');

export type FacilityWithDetails = FacilityResponseDto;
export type FacilityLookup = FacilityLookupResponseDto;

// truy cap db 
export interface IFacilitiesRepository {
  // tạo một facility
  create(data: DeepPartial<Facility>): Facility;
  //
  save(facility: Facility): Promise<Facility>;
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
