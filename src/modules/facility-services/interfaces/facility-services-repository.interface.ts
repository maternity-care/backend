import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { FacilityService } from '../entities/facility-service.entity';
import { SearchFacilityServiceDto } from '../dto/requests/search-facility-service.dto';
import { FacilityServiceResponseDto } from '../dto/responses/facility-service-response.dto';

export const FACILITY_SERVICES_REPOSITORY = Symbol('FACILITY_SERVICES_REPOSITORY');

export type FacilityServiceWithDetails = FacilityServiceResponseDto;

export interface IFacilityServicesRepository {
  create(data: DeepPartial<FacilityService>): FacilityService;
  save(entity: FacilityService): Promise<FacilityService>;
  saveAndDetachFromPackages(entity: FacilityService): Promise<FacilityService>;
  saveMany(entities: FacilityService[]): Promise<FacilityService[]>;
  remove(entity: FacilityService): Promise<void>;
  findById(id: string): Promise<FacilityService | null>;
  findDetailsById(id: string): Promise<FacilityServiceWithDetails | null>;
  findByFacilityAndService(facilityId: string, serviceId: string): Promise<FacilityService | null>;
  findAll(filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]>;
  findAllPaginated(filters?: SearchFacilityServiceDto): Promise<PaginationResult<FacilityServiceWithDetails>>;
  findPublicByFacilityId(facilityId: string, filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]>;
  countDependencies(facilityId: string, serviceId: string, facilityServiceId?: string): Promise<number>;
}
