import { DeepPartial } from 'typeorm';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { PaginationResult } from '../../../common/helpers/pagination';
import { ServiceType } from '../entities/service-type.entity';
import { SearchServiceTypesDto } from '../dto/requests/search-service-types.dto';

export const SERVICE_TYPES_REPOSITORY = Symbol('SERVICE_TYPES_REPOSITORY');

export interface IServiceTypesRepository {
  create(data: DeepPartial<ServiceType>): ServiceType;
  save(serviceType: ServiceType): Promise<ServiceType>;
  remove(serviceType: ServiceType): Promise<void>;
  findById(id: string): Promise<ServiceType | null>;
  findByCode(code: string): Promise<ServiceType | null>;
  findByName(name: string, excludeId?: string): Promise<ServiceType | null>;
  findCodesByPrefix(prefix: string): Promise<string[]>;
  findAll(filters?: SearchServiceTypesDto): Promise<ServiceType[]>;
  findAllPaginated(filters?: SearchServiceTypesDto): Promise<PaginationResult<ServiceType>>;
  countDependencies(serviceTypeId: string): Promise<number>;
  updateStatus(serviceType: ServiceType, status: ActiveStatus): Promise<ServiceType>;
}
