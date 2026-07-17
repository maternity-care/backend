import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { FacilityService } from '../entities/facility-services.entity';
import { SearchFacilityServiceDto } from '../dto/requests/search-facility-service.dto';
import { AvailabilityStatus } from '../../../common/constants/status.enum';
import { FacilityServiceResponseDto } from '../dto/responses/facility-service-response.dto';

export const FACILITY_SERVICES_REPOSITORY = Symbol('FACILITY_SERVICES_REPOSITORY');

export type FacilityServiceWithDetails = FacilityServiceResponseDto;

export interface IFacilityServicesRepository {
  create(data: DeepPartial<FacilityService>): FacilityService;
  save(entity: FacilityService): Promise<FacilityService>;
  remove(entity: FacilityService): Promise<void>;
  findById(id: string): Promise<FacilityService | null>;
  findDetailsById(id: string): Promise<FacilityServiceWithDetails | null>;
  findByFacilityAndService(facilityId: string, serviceId: string): Promise<FacilityService | null>;
  findAll(filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]>;
  findAllPaginated(filters?: SearchFacilityServiceDto): Promise<PaginationResult<FacilityServiceWithDetails>>;
  findPublicByFacilityId(facilityId: string, filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]>;
  countDependencies(facilityId: string, serviceId: string): Promise<number>;
  updateStatus(entity: FacilityService, status: AvailabilityStatus): Promise<FacilityService>;
}
