import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { AvailabilityStatus, ActiveStatus, FacilityStatus } from '../../../common/constants/status.enum';
import { paginate } from '../../../common/helpers/pagination';
import { FacilityService } from '../entities/facility-services.entity';
import { SearchFacilityServiceDto } from '../dto/requests/search-facility-service.dto';
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

  // Xóa cứng mapping khi chưa có appointment/extra-service phụ thuộc.
  async remove(entity: FacilityService): Promise<void> {
    await this.repository.remove(entity);
  }

  // Tìm mapping theo id.
  findById(id: string): Promise<FacilityService | null> {
    return this.repository.findOne({ where: { id } });
  }

  // Kiểm tra một facility đã được gán service này chưa để chống trùng unique pair.
  findByFacilityAndService(facilityId: string, serviceId: string): Promise<FacilityService | null> {
    return this.repository.findOne({ where: { facilityId, serviceId } });
  }

  // Danh sách management: filter theo facility/service/status/serviceType/search.
  findAll(filters?: SearchFacilityServiceDto): Promise<FacilityService[]> {
    return this.buildListQuery(filters).getMany();
  }

  // Danh sách management có phân trang.
  findAllPaginated(filters?: SearchFacilityServiceDto) {
    return paginate(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  // Public list: chỉ trả dịch vụ đang available, service gốc active, facility active.
  async findPublicByFacilityId(
    facilityId: string,
    filters?: SearchFacilityServiceDto,
  ): Promise<FacilityServiceWithDetails[]> {
    const query = this.repository
      .createQueryBuilder('facilityService')
      .innerJoin('services', 'service', 'service.id = facilityService.serviceId')
      .innerJoin('facilities', 'facility', 'facility.id = facilityService.facilityId')
      .select('facilityService.id', 'id')
      .addSelect('facilityService.facilityId', 'facilityId')
      .addSelect('facilityService.serviceId', 'serviceId')
      .addSelect('facilityService.price', 'price')
      .addSelect('facilityService.durationMinutes', 'durationMinutes')
      .addSelect('facilityService.status', 'status')
      .addSelect('service.code', 'serviceCode')
      .addSelect('service.name', 'serviceName')
      .addSelect('service.description', 'serviceDescription')
      .addSelect('service.service_type', 'serviceType')
      .addSelect('service.base_price', 'serviceBasePrice')
      .addSelect('service.default_duration_minutes', 'serviceDefaultDurationMinutes')
      .addSelect('service.requires_doctor_warning', 'serviceRequiresDoctorWarning')
      .where('facilityService.facilityId = :facilityId', { facilityId })
      .andWhere('facilityService.status = :available', { available: AvailabilityStatus.AVAILABLE })
      .andWhere('service.status = :active', { active: ActiveStatus.ACTIVE })
      .andWhere('facility.status = :facilityActive', { facilityActive: FacilityStatus.ACTIVE })
      .orderBy('service.name', 'ASC');

    if (filters?.serviceType) {
      query.andWhere('service.service_type = :serviceType', { serviceType: filters.serviceType });
    }
    if (filters?.search) {
      query.andWhere(
        '(LOWER(service.code) LIKE LOWER(:search) OR LOWER(service.name) LIKE LOWER(:search) OR LOWER(service.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query.getRawMany<FacilityServiceWithDetails>();
  }

  // Đếm dữ liệu đã phát sinh từ cặp facility-service để quyết định hard delete hay unavailable.
  async countDependencies(facilityId: string, serviceId: string): Promise<number> {
    const tables = [
      { table: 'appointments', facilityColumn: 'facility_id', serviceColumn: 'service_id' },
      { table: 'patient_extra_services', facilityColumn: 'facility_id', serviceColumn: 'service_id' },
    ];

    const rows = await Promise.all(tables.map(item => this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(item.table, item.table)
      .where(`${item.table}.${item.facilityColumn} = :facilityId`, { facilityId })
      .andWhere(`${item.table}.${item.serviceColumn} = :serviceId`, { serviceId })
      .getRawOne<{ count: string }>()));

    return rows.reduce((total, row) => total + Number(row?.count ?? 0), 0);
  }

  // Chuyển mapping sang unavailable thay vì xóa cứng khi đã có lịch sử sử dụng.
  updateStatus(entity: FacilityService, status: AvailabilityStatus): Promise<FacilityService> {
    entity.status = status;
    return this.repository.save(entity);
  }

  // Query chung cho findAll và findAllPaginated.
  private buildListQuery(filters?: SearchFacilityServiceDto): SelectQueryBuilder<FacilityService> {
    const query = this.repository
      .createQueryBuilder('facilityService')
      .innerJoin('services', 'service', 'service.id = facilityService.serviceId')
      .orderBy('facilityService.createdAt', 'DESC');

    if (filters?.facilityId) {
      query.andWhere('facilityService.facilityId = :facilityId', { facilityId: filters.facilityId });
    }
    if (filters?.serviceId) {
      query.andWhere('facilityService.serviceId = :serviceId', { serviceId: filters.serviceId });
    }
    if (filters?.status) {
      query.andWhere('facilityService.status = :status', { status: filters.status });
    }
    if (filters?.serviceType) {
      query.andWhere('service.service_type = :serviceType', { serviceType: filters.serviceType });
    }
    if (filters?.search) {
      query.andWhere(
        '(LOWER(service.code) LIKE LOWER(:search) OR LOWER(service.name) LIKE LOWER(:search) OR LOWER(service.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }
}
