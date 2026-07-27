import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { paginate } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { Service } from '../../services/entities/service.entity';
import { SearchServiceTypesDto } from '../dto/requests/search-service-types.dto';
import { ServiceType } from '../entities/service-type.entity';
import { IServiceTypesRepository } from '../interfaces/service-types-repository.interface';

@Injectable()
export class ServiceTypesRepository implements IServiceTypesRepository {
  constructor(
    @InjectRepository(ServiceType)
    private readonly repository: Repository<ServiceType>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  create(data: DeepPartial<ServiceType>): ServiceType {
    return this.repository.create(data);
  }

  save(serviceType: ServiceType): Promise<ServiceType> {
    return this.repository.save(serviceType);
  }

  async remove(serviceType: ServiceType): Promise<void> {
    await this.repository.remove(serviceType);
  }

  findById(id: string): Promise<ServiceType | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<ServiceType | null> {
    return this.repository.findOne({ where: { code } });
  }

  async findByName(name: string, excludeId?: string): Promise<ServiceType | null> {
    const query = this.repository
      .createQueryBuilder('serviceType')
      .where('LOWER(serviceType.name) = LOWER(:name)', { name });

    if (excludeId) {
      query.andWhere('serviceType.id <> :excludeId', { excludeId });
    }

    return query.getOne();
  }

  async findCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('serviceType')
      .select('serviceType.code', 'code')
      .where('serviceType.code = :prefix OR serviceType.code LIKE :pattern', {
        prefix,
        pattern: `${prefix}_%`,
      })
      .getRawMany<{ code: string }>();

    return rows.map((row) => row.code);
  }

  findAll(filters?: SearchServiceTypesDto): Promise<ServiceType[]> {
    return this.buildQuery(filters)
      .orderBy('serviceType.createdAt', 'DESC')
      .getMany();
  }

  findAllPaginated(filters?: SearchServiceTypesDto) {
    return paginate(
      this.buildQuery(filters).orderBy('serviceType.createdAt', 'DESC'),
      {
        page: filters?.page,
        limit: filters?.limit,
      },
    );
  }

  countDependencies(serviceTypeId: string): Promise<number> {
    return this.serviceRepository.count({ where: { serviceTypeId } });
  }

  updateStatus(serviceType: ServiceType, status: ActiveStatus): Promise<ServiceType> {
    serviceType.status = status;
    return this.repository.save(serviceType);
  }

  private buildQuery(filters?: SearchServiceTypesDto): SelectQueryBuilder<ServiceType> {
    const query = this.repository.createQueryBuilder('serviceType');

    searchBuilder(query, filters?.search, {
      columns: ['code', 'name', 'description'],
    });

    if (filters?.status) {
      query.andWhere('serviceType.status = :status', { status: filters.status });
    }

    return query;
  }
}
