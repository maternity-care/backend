import { DeepPartial } from 'typeorm';
import { Service } from '../../../database/entities/services.entity';
import { PaginationResult } from '../../../common/helpers/pagination';
import { SearchServiceDto } from '../dto/requests/search-service.dto';
import { ActiveStatus } from '../../../common/constants/status.enum';

export const SERVICES_REPOSITORY = Symbol('SERVICES_REPOSITORY');

export interface IServicesRepository {
  create(data: DeepPartial<Service>): Service;
  save(service: Service): Promise<Service>;
  remove(service: Service): Promise<void>;
  findById(id: string): Promise<Service | null>;
  findByCode(code: string): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  findAll(filters?: SearchServiceDto): Promise<Service[]>;
  findAllPaginated(filters?: SearchServiceDto): Promise<PaginationResult<Service>>;
  countDependencies(serviceId: string): Promise<number>;
  updateStatus(service: Service, status: ActiveStatus): Promise<Service>;
}
