import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { Service } from '../entities/service.entity';
import { paginate } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { ActiveStatus } from '../../../common/constants/status.enum';
import { SearchServiceDto } from '../dto/requests/search-service.dto';
import { IServicesRepository } from '../interfaces/services-repository.interface';

@Injectable()
export class ServicesRepository implements IServicesRepository {
  constructor(
    // InjectRepository(Service) cho Nest biết repository này thao tác với bảng services.
    @InjectRepository(Service)
    private readonly repository: Repository<Service>,
  ) {}

  // Tạo entity trong memory; chưa ghi DB cho tới khi gọi save().
  create(data: DeepPartial<Service>): Service {
    return this.repository.create(data);
  }

  // Lưu entity xuống DB; TypeORM tự insert hoặc update tùy entity có id hay chưa.
  save(service: Service): Promise<Service> {
    return this.repository.save(service);
  }

  // Hard delete record khỏi DB; chỉ dùng khi service chưa phát sinh dependency.
  async remove(service: Service): Promise<void> {
    await this.repository.remove(service);
  }

  // Tìm theo id để phục vụ detail/update/delete.
  findById(id: string): Promise<Service | null> {
    return this.repository.findOne({ where: { id } });
  }

  // Tìm theo code để chống trùng mã dịch vụ.
  findByCode(code: string): Promise<Service | null> {
    return this.repository.findOne({ where: { code } });
  }

  // Tìm theo name để hạn chế tạo 2 dịch vụ cùng tên.
  findByName(name: string): Promise<Service | null> {
    return this.repository.findOne({ where: { name } });
  }

  // Lấy danh sách không phân trang, dùng cho dropdown hoặc public list nhỏ.
  findAll(filters?: SearchServiceDto): Promise<Service[]> {
    return this.buildListQuery(filters).getMany();
  }

  // Lấy danh sách có phân trang, dùng cho màn hình management.
  findAllPaginated(filters?: SearchServiceDto) {
    return paginate(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  // Đếm các bảng đang dùng service này để quyết định hard delete hay chuyển inactive.
  async countDependencies(serviceId: string): Promise<number> {
    const tables = [
      { table: 'appointments', column: 'service_id' },
      { table: 'patient_extra_services', column: 'service_id' },
      { table: 'patient_package_benefits', column: 'service_id' },
    ];

    const rows = await Promise.all(
      tables.map(item => this.countRowsIfTableExists(item.table, item.column, serviceId)),
    );

    const packageItemCount = await this.countPackageItemsByServiceIfTableExists(serviceId);

    return rows.reduce((total, count) => total + count, packageItemCount);
  }

  // Chuyển trạng thái, ví dụ service đã được dùng thì delete sẽ đổi thành inactive.
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
      if ((error as { code?: string; errno?: number }).code === 'ER_NO_SUCH_TABLE' || (error as { errno?: number }).errno === 1146) {
        return 0;
      }
      throw error;
    }
  }

  private async countPackageItemsByServiceIfTableExists(serviceId: string): Promise<number> {
    try {
      const row = await this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('package_items', 'packageItem')
        .innerJoin('facility_services', 'facilityService', 'facilityService.id = packageItem.facility_service_id')
        .where('facilityService.service_id = :serviceId', { serviceId })
        .getRawOne<{ count: string }>();
      return Number(row?.count ?? 0);
    } catch (error) {
      if ((error as { code?: string; errno?: number }).code === 'ER_NO_SUCH_TABLE' || (error as { errno?: number }).errno === 1146) {
        return 0;
      }
      throw error;
    }
  }

  // Gom toàn bộ filter vào một query builder để findAll và findAllPaginated dùng chung.
  private buildListQuery(filters?: SearchServiceDto): SelectQueryBuilder<Service> {
    const query = this.repository.createQueryBuilder('service');

    searchBuilder(query, filters?.search, {
      columns: ['code', 'name', 'description', 'serviceType'],
    });

    if (filters?.serviceType) {
      query.andWhere('service.serviceType = :serviceType', { serviceType: filters.serviceType });
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
