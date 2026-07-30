import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository, SelectQueryBuilder } from 'typeorm';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { paginate } from '../../../common/helpers/pagination';
import { FacilityService } from '../../facility-services/entities/facility-service.entity';
import { PackageItem } from '../../package-services/entities/package-item.entity';
import { PackageServiceFacility } from '../../package-services/entities/package-service-facility.entity';
import { SearchServiceDto } from '../dto/requests/search-service.dto';
import { Service } from '../entities/service.entity';
import { IServicesRepository } from '../interfaces/services-repository.interface';

@Injectable()
export class ServicesRepository implements IServicesRepository {
  constructor(
    @InjectRepository(Service)
    private readonly repository: Repository<Service>,
  ) {}

  create(data: DeepPartial<Service>): Service {
    return this.repository.create(data);
  }

  save(service: Service): Promise<Service> {
    return this.repository.save(service);
  }

  async remove(service: Service): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      const facilityServices = await manager.find(FacilityService, {
        where: { serviceId: service.id },
        select: { id: true },
      });
      const facilityServiceIds = facilityServices.map((item) => item.id);

      if (facilityServiceIds.length > 0) {
        const packageItems = await manager.find(PackageItem, {
          where: { facilityServiceId: In(facilityServiceIds) },
          select: { id: true },
        });
        const packageItemIds = packageItems.map((item) => item.id);

        if (packageItemIds.length > 0) {
          await manager.delete(PackageServiceFacility, { packageItemId: In(packageItemIds) });
          await manager.delete(PackageItem, { id: In(packageItemIds) });
        }

        await manager.delete(FacilityService, { id: In(facilityServiceIds) });
      }

      await manager.remove(Service, service);
    });
  }

  findById(id: string): Promise<Service | null> {
    return this.repository.findOne({
      where: { id },
      relations: { serviceType: true },
    });
  }

  findByCode(code: string): Promise<Service | null> {
    return this.repository.findOne({ where: { code } });
  }

  async findCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('service')
      .select('service.code', 'code')
      .where('service.code = :prefix OR service.code LIKE :pattern', {
        prefix,
        pattern: `${prefix}_%`,
      })
      .getRawMany<{ code: string }>();

    return rows.map((row) => row.code);
  }

  findByName(name: string): Promise<Service | null> {
    return this.repository.findOne({ where: { name } });
  }

  findAll(filters?: SearchServiceDto): Promise<Service[]> {
    return this.buildListQuery(filters).getMany();
  }

  findAllPaginated(filters?: SearchServiceDto) {
    return paginate(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  async countDependencies(serviceId: string): Promise<number> {
    const tables = [
      { table: 'appointments', column: 'service_id' },
      { table: 'patient_extra_services', column: 'service_id' },
      { table: 'patient_package_benefits', column: 'service_id' },
    ];

    const rows = await Promise.all(
      tables.map((item) => this.countRowsIfTableExists(item.table, item.column, serviceId)),
    );

    return rows.reduce((total, count) => total + count, 0);
  }

  updateStatus(service: Service, status: ActiveStatus): Promise<Service> {
    service.status = status;
    return this.repository.save(service);
  }

  private async countRowsIfTableExists(
    table: string,
    column: string,
    serviceId: string,
  ): Promise<number> {
    try {
      const row = await this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(table, table)
        .where(`${table}.${column} = :serviceId`, { serviceId })
        .getRawOne<{ count: string }>();
      return Number(row?.count ?? 0);
    } catch (error) {
      if (
        (error as { code?: string; errno?: number }).code === 'ER_NO_SUCH_TABLE' ||
        (error as { errno?: number }).errno === 1146
      ) {
        return 0;
      }
      throw error;
    }
  }

  private buildListQuery(filters?: SearchServiceDto): SelectQueryBuilder<Service> {
    const query = this.repository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.serviceType', 'serviceType');

    if (filters?.search) {
      query.andWhere(
        `(${[
          'CAST(service.id AS CHAR) LIKE :search',
          'LOWER(service.code) LIKE LOWER(:search)',
          'LOWER(service.name) LIKE LOWER(:search)',
        ].join(' OR ')})`,
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.serviceTypeId) {
      query.andWhere('service.serviceTypeId = :serviceTypeId', {
        serviceTypeId: filters.serviceTypeId,
      });
    }

    if (filters?.saleMode) {
      query.andWhere('service.saleMode = :saleMode', { saleMode: filters.saleMode });
    }

    if (filters?.status) {
      query.andWhere('service.status = :status', { status: filters.status });
    }

    return query.orderBy('service.createdAt', 'DESC');
  }
}
