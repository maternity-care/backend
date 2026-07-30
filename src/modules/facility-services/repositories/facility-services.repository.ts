import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ActiveStatus,
  FacilityStatus,
} from '../../../common/constants/status.enum';
import { PackageItem } from '../../package-services/entities/package-item.entity';
import { PackageServiceFacility } from '../../package-services/entities/package-service-facility.entity';
import { ServiceSaleMode } from '../../services/dto/requests/create-service.dto';
import { FacilityServiceResponseDto } from '../dto/responses/facility-service-response.dto';
import { SearchFacilityServiceDto } from '../dto/requests/search-facility-service.dto';
import { FacilityService } from '../entities/facility-service.entity';
import {
  FacilityServiceWithDetails,
  IFacilityServicesRepository,
} from '../interfaces/facility-services-repository.interface';

@Injectable()
export class FacilityServicesRepository implements IFacilityServicesRepository {
  constructor(
    // Repository này thao tác với bảng facility_services: giá/thời lượng thực tế của service tại từng cơ sở.
    @InjectRepository(FacilityService)
    private readonly repository: Repository<FacilityService>,
  ) {}

  // Tạo entity trong memory; chưa ghi DB cho tới khi gọi save().
  create(data: DeepPartial<FacilityService>): FacilityService {
    return this.repository.create(data);
  }

  // Lưu mapping facility-service xuống DB.
  save(entity: FacilityService): Promise<FacilityService> {
    return this.repository.save(entity);
  }

  saveMany(entities: FacilityService[]): Promise<FacilityService[]> {
    return this.repository.save(entities);
  }

  // Xóa cứng mapping khi chưa có dữ liệu phụ thuộc.
  async remove(entity: FacilityService): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      const packageItems = await manager.find(PackageItem, {
        where: { facilityServiceId: entity.id },
        select: { id: true },
      });
      const packageItemIds = packageItems.map((item) => item.id);

      if (packageItemIds.length > 0) {
        await manager.delete(PackageServiceFacility, { packageItemId: In(packageItemIds) });
        await manager.delete(PackageItem, { id: In(packageItemIds) });
      }

      await manager.remove(FacilityService, entity);
    });
  }

  // Tìm mapping theo id, dùng cho update/delete.
  findById(id: string): Promise<FacilityService | null> {
    return this.repository.findOne({ where: { id } });
  }

  // Detail trả nested object để FE không phải tự join facility/service.
  async findDetailsById(id: string): Promise<FacilityServiceWithDetails | null> {
    const row = await this.buildDetailsQuery()
      .where('facilityService.id = :id', { id })
      .getRawOne<Record<string, unknown>>();
    return row ? this.mapRowToResponse(row) : null;
  }

  // Kiểm tra một facility đã được gán service này chưa để chống trùng unique pair.
  findByFacilityAndService(facilityId: string, serviceId: string): Promise<FacilityService | null> {
    return this.repository.findOne({ where: { facilityId, serviceId } });
  }

  // Danh sách management: filter theo facility/service/status/serviceTypeId/search.
  async findAll(filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]> {
    const rows = await this.buildListQuery(filters).getRawMany<Record<string, unknown>>();
    return rows.map(row => this.mapRowToResponse(row));
  }

  // Danh sách management có phân trang.
  findAllPaginated(filters?: SearchFacilityServiceDto) {
    return this.paginateRaw<FacilityServiceWithDetails>(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  // Public list: chỉ trả dịch vụ đang available, service gốc active, facility active.
  async findPublicByFacilityId(
    facilityId: string,
    filters?: SearchFacilityServiceDto,
  ): Promise<FacilityServiceWithDetails[]> {
    const query = this.buildDetailsQuery()
      .where('facilityService.facilityId = :facilityId', { facilityId })
      .andWhere('facilityService.status = :facilityServiceActive', { facilityServiceActive: ActiveStatus.ACTIVE })
      .andWhere('service.status = :active', { active: ActiveStatus.ACTIVE })
      .andWhere('facility.status = :facilityActive', { facilityActive: FacilityStatus.ACTIVE })
      .andWhere('service.sale_mode IN (:...publicSaleModes)', {
        publicSaleModes: [ServiceSaleMode.STANDALONE, ServiceSaleMode.BOTH],
      })
      .orderBy('service.name', 'ASC');

    if (filters?.serviceTypeId) {
      query.andWhere('service.service_type_id = :serviceTypeId', { serviceTypeId: filters.serviceTypeId });
    }
    if (filters?.search) {
      query.andWhere(
        '(LOWER(service.code) LIKE LOWER(:search) OR LOWER(service.name) LIKE LOWER(:search) OR LOWER(service.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    const rows = await query.getRawMany<Record<string, unknown>>();
    return rows.map(row => this.mapRowToResponse(row));
  }

  // Đếm dữ liệu đã phát sinh từ cặp facility-service để quyết định hard delete hay unavailable.
  async countDependencies(
    facilityId: string,
    serviceId: string,
    facilityServiceId?: string,
  ): Promise<number> {
    const tables = [
      { table: 'appointments', facilityColumn: 'facility_id', serviceColumn: 'service_id' },
      { table: 'patient_extra_services', facilityColumn: 'facility_id', serviceColumn: 'service_id' },
    ];

    const rows = await Promise.all(
      tables.map((item) =>
        this.countRowsIfTableExists(item.table, item.facilityColumn, item.serviceColumn, facilityId, serviceId),
      ),
    );

    return rows.reduce((total, count) => total + count, 0);
  }

  // Chuyển mapping sang unavailable thay vì xóa cứng khi đã có lịch sử sử dụng.
  updateStatus(entity: FacilityService, status: ActiveStatus): Promise<FacilityService> {
    entity.status = status;
    return this.repository.save(entity);
  }

  private buildListQuery(filters?: SearchFacilityServiceDto): SelectQueryBuilder<FacilityService> {
    const query = this.buildDetailsQuery().orderBy('facilityService.createdAt', 'DESC');

    if (filters?.facilityId) {
      query.andWhere('facilityService.facilityId = :facilityId', { facilityId: filters.facilityId });
    }
    if (filters?.serviceId) {
      query.andWhere('facilityService.serviceId = :serviceId', { serviceId: filters.serviceId });
    }
    if (filters?.status) {
      query.andWhere('facilityService.status = :status', { status: filters.status });
    }
    if (filters?.serviceTypeId) {
      query.andWhere('service.service_type_id = :serviceTypeId', { serviceTypeId: filters.serviceTypeId });
    }
    if (filters?.search) {
      query.andWhere(
        '(LOWER(service.code) LIKE LOWER(:search) OR LOWER(service.name) LIKE LOWER(:search) OR LOWER(service.description) LIKE LOWER(:search) OR LOWER(facility.code) LIKE LOWER(:search) OR LOWER(facility.name) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }

  private buildDetailsQuery(): SelectQueryBuilder<FacilityService> {
    return this.repository
      .createQueryBuilder('facilityService')
      .innerJoin('services', 'service', 'service.id = facilityService.serviceId')
      .innerJoin('service_types', 'serviceType', 'serviceType.id = service.service_type_id')
      .innerJoin('facilities', 'facility', 'facility.id = facilityService.facilityId')
      .select('facilityService.id', 'id')
      .addSelect('facilityService.facilityId', 'facilityId')
      .addSelect('facilityService.serviceId', 'serviceId')
      .addSelect('facilityService.price', 'price')
      .addSelect('facilityService.durationMinutes', 'durationMinutes')
      .addSelect('facilityService.status', 'status')
      .addSelect('facilityService.createdAt', 'createdAt')
      .addSelect('facilityService.updatedAt', 'updatedAt')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('facility.name', 'facilityName')
      .addSelect('facility.address', 'facilityAddress')
      .addSelect('facility.province', 'facilityProvince')
      .addSelect('facility.ward', 'facilityWard')
      .addSelect('facility.status', 'facilityStatus')
      .addSelect('service.code', 'serviceCode')
      .addSelect('service.name', 'serviceName')
      .addSelect('service.description', 'serviceDescription')
      .addSelect('service.service_type_id', 'serviceTypeId')
      .addSelect('serviceType.code', 'serviceTypeCode')
      .addSelect('serviceType.name', 'serviceTypeName')
      .addSelect('serviceType.description', 'serviceTypeDescription')
      .addSelect('serviceType.status', 'serviceTypeStatus')
      .addSelect('service.sale_mode', 'serviceSaleMode')
      .addSelect('service.base_price', 'serviceBasePrice')
      .addSelect('service.default_duration_minutes', 'serviceDefaultDurationMinutes')
      .addSelect('service.requires_doctor_warning', 'serviceRequiresDoctorWarning')
      .addSelect('service.status', 'serviceStatus');
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<FacilityService>,
    options?: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const total = await query.clone().getCount();
    const rows = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();

    return {
      items: rows.map(row => this.mapRowToResponse(row)) as T[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async countRowsIfTableExists(
    table: string,
    facilityColumn: string,
    serviceColumn: string,
    facilityId: string,
    serviceId: string,
  ): Promise<number> {
    try {
      const row = await this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(table, table)
        .where(`${table}.${facilityColumn} = :facilityId`, { facilityId })
        .andWhere(`${table}.${serviceColumn} = :serviceId`, { serviceId })
        .getRawOne<{ count: string }>();
      return Number(row?.count ?? 0);
    } catch (error) {
      if ((error as { code?: string; errno?: number }).code === 'ER_NO_SUCH_TABLE' || (error as { errno?: number }).errno === 1146) {
        return 0;
      }
      throw error;
    }
  }

  private mapRowToResponse(row: Record<string, unknown>): FacilityServiceResponseDto {
    return {
      id: String(row.id),
      facilityId: String(row.facilityId),
      serviceId: String(row.serviceId),
      price: String(row.price),
      durationMinutes: Number(row.durationMinutes),
      status: row.status as ActiveStatus,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      facility: {
        id: String(row.facilityId),
        code: String(row.facilityCode),
        name: String(row.facilityName),
        address: row.facilityAddress as string,
        province: row.facilityProvince as string,
        ward: row.facilityWard as string,
        status: row.facilityStatus as string,
      },
      service: {
        id: String(row.serviceId),
        code: String(row.serviceCode),
        name: String(row.serviceName),
        description: row.serviceDescription as string | null,
        serviceTypeId: String(row.serviceTypeId),
        serviceType: {
          id: String(row.serviceTypeId),
          code: String(row.serviceTypeCode),
          name: String(row.serviceTypeName),
          description: row.serviceTypeDescription as string | null,
          status: row.serviceTypeStatus as ActiveStatus,
        },
        saleMode: row.serviceSaleMode as never,
        basePrice: String(row.serviceBasePrice),
        defaultDurationMinutes: Number(row.serviceDefaultDurationMinutes),
        requiresDoctorWarning: row.serviceRequiresDoctorWarning as number,
        status: row.serviceStatus as ActiveStatus,
      },
    };
  }
}
