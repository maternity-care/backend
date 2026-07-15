import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { FacilityService } from '../entities/facility-services.entity';
import { SearchFacilityServiceDto } from '../dto/requests/search-facility-service.dto';
import { AvailabilityStatus } from '../../../common/constants/status.enum';

export const FACILITY_SERVICES_REPOSITORY = Symbol('FACILITY_SERVICES_REPOSITORY');

export interface FacilityServiceWithDetails extends FacilityService {
  serviceCode?: string;
  serviceName?: string;
  serviceDescription?: string | null;
  serviceType?: string;
  serviceBasePrice?: string;
  serviceDefaultDurationMinutes?: number;
  serviceRequiresDoctorWarning?: number;
}

export interface IFacilityServicesRepository {
  create(data: DeepPartial<FacilityService>): FacilityService;
  save(entity: FacilityService): Promise<FacilityService>;
  remove(entity: FacilityService): Promise<void>;
  findById(id: string): Promise<FacilityService | null>;
  findByFacilityAndService(facilityId: string, serviceId: string): Promise<FacilityService | null>;
  findAll(filters?: SearchFacilityServiceDto): Promise<FacilityService[]>;
  findAllPaginated(filters?: SearchFacilityServiceDto): Promise<PaginationResult<FacilityService>>;
  findPublicByFacilityId(facilityId: string, filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]>;
  countDependencies(facilityId: string, serviceId: string): Promise<number>;
  updateStatus(entity: FacilityService, status: AvailabilityStatus): Promise<FacilityService>;
}
