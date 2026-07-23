import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { PackageServiceFacility } from '../entities/package-service-facilities.entity';
import { PackageService } from '../entities/package-item.entity';
import { PackageServiceFacilityScope } from '../dto/requests/create-package-service.dto';
import { SearchPackageServiceDto } from '../dto/requests/search-package-service.dto';
import {
  IPackageServicesRepository,
  PackageServiceWithDetails,
} from '../interfaces/package-services-repository.interface';

@Injectable()
export class PackageServicesRepository implements IPackageServicesRepository {
  constructor(
    @InjectRepository(PackageService)
    private readonly repository: Repository<PackageService>,
    @InjectRepository(PackageServiceFacility)
    private readonly facilityRepository: Repository<PackageServiceFacility>,
  ) {}

  // Tạo entity PackageService trong memory, chưa ghi DB.
  create(data: DeepPartial<PackageService>): PackageService {
    return this.repository.create(data);
  }

  // Lưu một package service đơn thuần, không xử lý facilityIds.
  save(entity: PackageService): Promise<PackageService> {
    return this.repository.save(entity);
  }

  // Lưu package service và danh sách facility được phép dùng trong cùng transaction.
  async saveWithFacilities(entity: PackageService, facilityIds?: string[]): Promise<PackageService> {
    return this.repository.manager.transaction(async manager => {
      const saved = await manager.save(PackageService, entity);

      if (saved.allowedFacilityScope === PackageServiceFacilityScope.SELECTED) {
        await manager.delete(PackageServiceFacility, { packageServiceId: saved.id });
        await manager.insert(
          PackageServiceFacility,
          (facilityIds ?? []).map(facilityId => ({ packageServiceId: saved.id, facilityId })),
        );
      } else {
        // Scope all nghĩa là dùng được ở mọi facility, nên không lưu row giới hạn facility.
        await manager.delete(PackageServiceFacility, { packageServiceId: saved.id });
      }

      return saved;
    });
  }

  // Thay toàn bộ danh sách facility được phép dùng cho một package service.
  async replaceFacilities(packageServiceId: string, facilityIds: string[]): Promise<void> {
    await this.repository.manager.transaction(async manager => {
      await manager.delete(PackageServiceFacility, { packageServiceId });
      if (facilityIds.length > 0) {
        await manager.insert(
          PackageServiceFacility,
          facilityIds.map(facilityId => ({ packageServiceId, facilityId })),
        );
      }
    });
  }

  // Xóa cứng package service khi chưa phát sinh quyền lợi bệnh nhân.
  async remove(entity: PackageService): Promise<void> {
    await this.repository.remove(entity);
  }

  findById(id: string): Promise<PackageService | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findDetailsById(id: string): Promise<PackageServiceWithDetails | null> {
    return (await this.buildDetailsQuery()
      .where('packageService.id = :id', { id })
      .getRawOne<PackageServiceWithDetails>()) ?? null;
  }

  findByPackageAndService(packageId: string, serviceId: string): Promise<PackageService | null> {
    return this.repository.findOne({ where: { packageId, serviceId } });
  }

  findAll(filters?: SearchPackageServiceDto): Promise<PackageServiceWithDetails[]> {
    return this.withFacilityIds(this.buildListQuery(filters).getRawMany<PackageServiceWithDetails>());
  }

  findAllPaginated(filters?: SearchPackageServiceDto) {
    return this.paginateRawWithFacilityIds(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  // Lấy danh sách service con kèm thông tin service gốc và facilityIds để hiển thị chi tiết gói.
  async findDetailsByPackageId(
    packageId: string,
    filters?: SearchPackageServiceDto,
  ): Promise<PackageServiceWithDetails[]> {
    const query = this.buildDetailsQuery()
      .where('packageService.packageId = :packageId', { packageId })
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

    return this.withFacilityIds(query.getRawMany<PackageServiceWithDetails>());
  }

  async findFacilityIds(packageServiceId: string): Promise<string[]> {
    const rows = await this.facilityRepository.find({ where: { packageServiceId } });
    return rows.map(row => row.facilityId);
  }

  // Nếu quyền lợi bệnh nhân đã được copy từ package_services, không nên xóa cấu hình gốc.
  async countGeneratedBenefits(packageId: string, serviceId: string): Promise<number> {
    const row = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('patient_package_benefits', 'benefit')
      .innerJoin('patient_packages', 'patientPackage', 'patientPackage.id = benefit.patient_package_id')
      .where('patientPackage.package_id = :packageId', { packageId })
      .andWhere('benefit.service_id = :serviceId', { serviceId })
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  private buildListQuery(filters?: SearchPackageServiceDto): SelectQueryBuilder<PackageService> {
    const query = this.buildDetailsQuery()
      .orderBy('packageService.createdAt', 'DESC');

    if (filters?.packageId) {
      query.andWhere('packageService.packageId = :packageId', { packageId: filters.packageId });
    }
    if (filters?.serviceId) {
      query.andWhere('packageService.serviceId = :serviceId', { serviceId: filters.serviceId });
    }
    if (filters?.allowedFacilityScope) {
      query.andWhere('packageService.allowedFacilityScope = :scope', { scope: filters.allowedFacilityScope });
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

  private buildDetailsQuery(): SelectQueryBuilder<PackageService> {
    return this.repository
      .createQueryBuilder('packageService')
      .innerJoin('services', 'service', 'service.id = packageService.serviceId')
      .innerJoin('maternity_packages', 'pkg', 'pkg.id = packageService.packageId')
      .select('packageService.id', 'id')
      .addSelect('packageService.packageId', 'packageId')
      .addSelect('packageService.serviceId', 'serviceId')
      .addSelect('packageService.includedQuantity', 'includedQuantity')
      .addSelect('packageService.isRequired', 'isRequired')
      .addSelect('packageService.isOptional', 'isOptional')
      .addSelect('packageService.allowedFacilityScope', 'allowedFacilityScope')
      .addSelect('packageService.createdAt', 'createdAt')
      .addSelect('packageService.updatedAt', 'updatedAt')
      .addSelect('pkg.code', 'packageCode')
      .addSelect('pkg.name', 'packageName')
      .addSelect('pkg.price', 'packagePrice')
      .addSelect('pkg.status', 'packageStatus')
      .addSelect('service.code', 'serviceCode')
      .addSelect('service.name', 'serviceName')
      .addSelect('service.description', 'serviceDescription')
      .addSelect('service.service_type', 'serviceType')
      .addSelect('service.base_price', 'serviceBasePrice');
  }

  private async withFacilityIds(
    rowsPromise: Promise<PackageServiceWithDetails[]>,
  ): Promise<PackageServiceWithDetails[]> {
    const rows = await rowsPromise;
    const facilityMap = await this.findFacilityIdsMap(rows.map(row => row.id));
    return rows.map(row => ({ ...row, facilityIds: facilityMap.get(row.id) ?? [] }));
  }

  private async paginateRawWithFacilityIds(
    query: SelectQueryBuilder<PackageService>,
    options?: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const total = await query.clone().getCount();
    const items = await this.withFacilityIds(
      query.offset((page - 1) * limit).limit(limit).getRawMany<PackageServiceWithDetails>(),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findFacilityIdsMap(packageServiceIds: string[]): Promise<Map<string, string[]>> {
    if (packageServiceIds.length === 0) return new Map();
    const rows = await this.facilityRepository
      .createQueryBuilder('facility')
      .where('facility.packageServiceId IN (:...packageServiceIds)', { packageServiceIds })
      .getMany();

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const values = map.get(row.packageServiceId) ?? [];
      values.push(row.facilityId);
      map.set(row.packageServiceId, values);
    }
    return map;
  }
}
