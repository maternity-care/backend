import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ActiveStatus,
  MaternityPackageStatus,
} from '../../../common/constants/status.enum';
import { PaginationResult } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { PackageItem } from '../../package-services/entities/package-item.entity';
import { PackageServiceFacilityScope } from '../../package-services/dto/requests/create-package-service.dto';
import { MaternityPackageResponseDto } from '../dto/responses/maternity-package-response.dto';
import { SearchMaternityPackageDto } from '../dto/requests/search-maternity-package.dto';
import { MaternityPackage } from '../entities/maternity-package.entity';
import { IMaternityPackagesRepository } from '../interfaces/maternity-packages-repository.interface';

@Injectable()
export class MaternityPackagesRepository implements IMaternityPackagesRepository {
  constructor(
    @InjectRepository(MaternityPackage)
    private readonly repository: Repository<MaternityPackage>,
    @InjectRepository(PackageItem)
    private readonly packageItemRepository: Repository<PackageItem>,
  ) {}

  // Tạo entity trong memory, chưa ghi DB cho tới khi gọi save().
  create(data: DeepPartial<MaternityPackage>): MaternityPackage {
    return this.repository.create(data);
  }

  // Lưu gói xuống DB; TypeORM tự insert/update theo id.
  save(entity: MaternityPackage): Promise<MaternityPackage> {
    return this.repository.save(entity);
  }

  // Lưu "vỏ gói" và danh sách dịch vụ con trong cùng transaction để tránh gói tạo nửa chừng.
  async saveWithItems(
    entity: MaternityPackage,
    items: DeepPartial<PackageItem>[] = [],
  ): Promise<MaternityPackage> {
    return this.repository.manager.transaction(async (manager) => {
      const savedPackage = await manager.save(MaternityPackage, entity);

      if (items.length > 0) {
        const packageItems = items.map(item => manager.create(PackageItem, {
          ...item,
          packageId: savedPackage.id,
        }));
        await manager.save(PackageItem, packageItems);
      }

      return savedPackage;
    });
  }

  // Thay toàn bộ dịch vụ trong gói; dùng khi admin chỉnh cấu hình gói trước khi mở bán.
  async replaceItems(
    packageId: string,
    items: DeepPartial<PackageItem>[] = [],
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(PackageItem, { packageId });

      if (items.length > 0) {
        const packageItems = items.map(item => manager.create(PackageItem, {
          ...item,
          packageId,
        }));
        await manager.save(PackageItem, packageItems);
      }
    });
  }

  // Hard delete gói; chỉ dùng khi chưa phát sinh package_items/patient_packages.
  async remove(entity: MaternityPackage): Promise<void> {
    await this.repository.remove(entity);
  }

  // Tìm gói theo id.
  findById(id: string): Promise<MaternityPackage | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findDetailsById(id: string): Promise<MaternityPackageResponseDto | null> {
    const rows = await this.buildDetailsQuery()
      .where('pkg.id = :id', { id })
      .orderBy('packageItem.sortOrder', 'ASC')
      .addOrderBy('packageItem.id', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return this.mapPackageRows(rows)[0] ?? null;
  }

  // Tìm theo code để chống trùng mã gói.
  findByCode(code: string): Promise<MaternityPackage | null> {
    return this.repository.findOne({ where: { code } });
  }

  // Tìm theo name để tránh tạo nhiều gói cùng tên gây rối cho người dùng.
  findByName(name: string): Promise<MaternityPackage | null> {
    return this.repository.findOne({ where: { name } });
  }

  // Danh sách không phân trang, trả nested services[].
  async findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackageResponseDto[]> {
    const ids = await this.findFilteredPackageIds(filters);
    return this.findDetailsByIds(ids);
  }

  // Danh sách có phân trang cho màn hình quản trị.
  async findAllPaginated(
    filters?: SearchMaternityPackageDto,
  ): Promise<PaginationResult<MaternityPackageResponseDto>> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const ids = await this.findFilteredPackageIds(filters);
    const pagedIds = ids.slice((page - 1) * limit, page * limit);

    return {
      items: await this.findDetailsByIds(pagedIds),
      total: ids.length,
      page,
      limit,
      totalPages: Math.ceil(ids.length / limit),
    };
  }

  // Public theo facility: chỉ trả gói active có item thuộc facility đó, facility-service available và service active.
  async findAvailableByFacilityId(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ): Promise<MaternityPackageResponseDto[]> {
    const ids = await this.findAvailablePackageIdsByFacility(facilityId, filters);
    return this.findDetailsByIds(ids, facilityId);
  }

  // Bản phân trang của API gói khả dụng theo facility.
  async findAvailableByFacilityIdPaginated(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ): Promise<PaginationResult<MaternityPackageResponseDto>> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const ids = await this.findAvailablePackageIdsByFacility(facilityId, filters);
    const pagedIds = ids.slice((page - 1) * limit, page * limit);

    return {
      items: await this.findDetailsByIds(pagedIds, facilityId),
      total: ids.length,
      page,
      limit,
      totalPages: Math.ceil(ids.length / limit),
    };
  }

  // Đếm dữ liệu phụ thuộc để quyết định hard delete hay chuyển inactive.
  async countDependencies(packageId: string): Promise<number> {
    const packageItemCount = await this.countRowsIfTableExists('package_items', 'package_id', packageId);
    const patientPackageCount = await this.countRowsIfTableExists('patient_packages', 'package_id', packageId);
    return packageItemCount + patientPackageCount;
  }

  // Chuyển trạng thái gói, dùng khi delete an toàn với gói đã có lịch sử.
  updateStatus(entity: MaternityPackage, status: MaternityPackageStatus): Promise<MaternityPackage> {
    entity.status = status;
    return this.repository.save(entity);
  }

  private async findFilteredPackageIds(filters?: SearchMaternityPackageDto): Promise<string[]> {
    const rows = await this.buildBasePackageQuery(filters)
      .select('pkg.id', 'id')
      .orderBy('pkg.priorityLevel', 'DESC')
      .addOrderBy('pkg.createdAt', 'DESC')
      .getRawMany<{ id: string }>();
    return rows.map(row => String(row.id));
  }

  private async findAvailablePackageIdsByFacility(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ): Promise<string[]> {
    const rows = await this.buildBasePackageQuery({
      ...filters,
      status: MaternityPackageStatus.ACTIVE,
    })
      .innerJoin('package_items', 'packageItem', 'packageItem.package_id = pkg.id')
      .innerJoin('facility_services', 'facilityService', 'facilityService.id = packageItem.facility_service_id')
      .innerJoin('services', 'service', 'service.id = facilityService.service_id')
      .innerJoin('service_types', 'serviceType', 'serviceType.id = service.service_type_id')
      .andWhere('pkg.facilityId = :facilityId', { facilityId })
      .andWhere('facilityService.facility_id = :facilityId', { facilityId })
      .andWhere('facilityService.status = :facilityServiceActive', { facilityServiceActive: ActiveStatus.ACTIVE })
      .andWhere('service.status = :active', { active: ActiveStatus.ACTIVE })
      .select('pkg.id', 'id')
      .groupBy('pkg.id')
      .orderBy('pkg.priorityLevel', 'DESC')
      .addOrderBy('pkg.createdAt', 'DESC')
      .getRawMany<{ id: string }>();

    return rows.map(row => String(row.id));
  }

  private async findDetailsByIds(
    ids: string[],
    facilityId?: string,
  ): Promise<MaternityPackageResponseDto[]> {
    if (ids.length === 0) {
      return [];
    }

    const query = this.buildDetailsQuery()
      .where('pkg.id IN (:...ids)', { ids })
      .orderBy('pkg.priorityLevel', 'DESC')
      .addOrderBy('pkg.createdAt', 'DESC')
      .addOrderBy('packageItem.sortOrder', 'ASC')
      .addOrderBy('packageItem.id', 'ASC');

    if (facilityId) {
      query.andWhere('facilityService.facility_id = :facilityId', { facilityId });
    }

    const rows = await query.getRawMany<Record<string, unknown>>();
    const mapped = this.mapPackageRows(rows);

    return ids
      .map(id => mapped.find(item => item.id === id))
      .filter((item): item is MaternityPackageResponseDto => Boolean(item));
  }

  private buildBasePackageQuery(
    filters?: SearchMaternityPackageDto,
  ): SelectQueryBuilder<MaternityPackage> {
    const query = this.repository.createQueryBuilder('pkg');

    searchBuilder(query, filters?.search, {
      columns: ['code', 'name', 'description'],
    });

    if (filters?.status) {
      query.andWhere('pkg.status = :status', { status: filters.status });
    }

    if (filters?.facilityId) {
      query.andWhere('pkg.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    return query;
  }

  private buildDetailsQuery(): SelectQueryBuilder<MaternityPackage> {
    return this.repository
      .createQueryBuilder('pkg')
      .innerJoin('facilities', 'packageFacility', 'packageFacility.id = pkg.facilityId')
      .leftJoin('package_items', 'packageItem', 'packageItem.package_id = pkg.id')
      .leftJoin('facility_services', 'facilityService', 'facilityService.id = packageItem.facility_service_id')
      .leftJoin('services', 'service', 'service.id = facilityService.service_id')
      .leftJoin('service_types', 'serviceType', 'serviceType.id = service.service_type_id')
      .select('pkg.id', 'id')
      .addSelect('pkg.facilityId', 'facilityId')
      .addSelect('pkg.code', 'code')
      .addSelect('pkg.name', 'name')
      .addSelect('pkg.description', 'description')
      .addSelect('pkg.packageType', 'packageType')
      .addSelect('pkg.price', 'price')
      .addSelect('pkg.durationDays', 'durationDays')
      .addSelect('pkg.priorityLevel', 'priorityLevel')
      .addSelect('pkg.status', 'status')
      .addSelect('pkg.createdAt', 'createdAt')
      .addSelect('pkg.updatedAt', 'updatedAt')
      .addSelect('packageFacility.code', 'facilityCode')
      .addSelect('packageFacility.name', 'facilityName')
      .addSelect('packageFacility.address', 'facilityAddress')
      .addSelect('packageFacility.province', 'facilityProvince')
      .addSelect('packageFacility.ward', 'facilityWard')
      .addSelect('packageFacility.status', 'facilityStatus')
      .addSelect('packageItem.id', 'packageItemId')
      .addSelect('packageItem.facility_service_id', 'facilityServiceId')
      .addSelect('packageItem.included_quantity', 'includedQuantity')
      .addSelect('packageItem.is_required', 'isRequired')
      .addSelect('packageItem.is_optional', 'isOptional')
      .addSelect('packageItem.allowed_facility_scope', 'allowedFacilityScope')
      .addSelect((subQuery) =>
        subQuery
          .select('GROUP_CONCAT(packageFacility.facility_id)')
          .from('package_service_facilities', 'packageFacility')
          .where('packageFacility.package_item_id = packageItem.id'),
      'facilityIds')
      .addSelect('packageItem.sort_order', 'sortOrder')
      .addSelect('facilityService.service_id', 'serviceId')
      .addSelect('facilityService.price', 'facilityServicePrice')
      .addSelect('facilityService.duration_minutes', 'facilityServiceDurationMinutes')
      .addSelect('facilityService.status', 'facilityServiceStatus')
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

  private mapPackageRows(rows: Record<string, unknown>[]): MaternityPackageResponseDto[] {
    const packages = new Map<string, MaternityPackageResponseDto>();

    for (const row of rows) {
      const id = String(row.id);
      const item = packages.get(id) ?? {
        id,
        facilityId: String(row.facilityId),
        code: String(row.code),
        name: String(row.name),
        description: row.description as string | null,
        packageType: String(row.packageType),
        price: String(row.price),
        durationDays: row.durationDays === null || row.durationDays === undefined
          ? null
          : Number(row.durationDays),
        priorityLevel: Number(row.priorityLevel ?? 0),
        status: row.status as MaternityPackageStatus,
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
        services: [],
      };

      if (row.packageItemId) {
        item.services.push({
          id: String(row.packageItemId),
          packageId: id,
          facilityServiceId: String(row.facilityServiceId),
          facilityId: String(row.facilityId),
          serviceId: String(row.serviceId),
          includedQuantity: Number(row.includedQuantity),
          isRequired: row.isRequired as number,
          isOptional: row.isOptional as number,
          allowedFacilityScope: String(row.allowedFacilityScope ?? PackageServiceFacilityScope.ALL),
          facilityIds: this.parseFacilityIds(row.facilityIds),
          sortOrder: Number(row.sortOrder ?? 0),
          price: String(row.facilityServicePrice),
          durationMinutes: Number(row.facilityServiceDurationMinutes),
          facilityServiceStatus: row.facilityServiceStatus as ActiveStatus,
          serviceCode: String(row.serviceCode),
          serviceName: String(row.serviceName),
          serviceDescription: row.serviceDescription as string | null,
          serviceTypeId: String(row.serviceTypeId),
          serviceType: {
            id: String(row.serviceTypeId),
            code: String(row.serviceTypeCode),
            name: String(row.serviceTypeName),
            description: row.serviceTypeDescription as string | null,
            status: row.serviceTypeStatus as ActiveStatus,
          },
          serviceSaleMode: String(row.serviceSaleMode),
          serviceBasePrice: String(row.serviceBasePrice),
          serviceDefaultDurationMinutes: Number(row.serviceDefaultDurationMinutes),
          serviceRequiresDoctorWarning: row.serviceRequiresDoctorWarning as number,
          serviceStatus: row.serviceStatus as ActiveStatus,
        });
      }

      packages.set(id, item);
    }

    return [...packages.values()].map(item => ({
      ...item,
      services: item.services.sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id)),
    }));
  }

  private async countRowsIfTableExists(
    table: string,
    column: string,
    packageId: string,
  ): Promise<number> {
    try {
      const row = await this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(table, table)
        .where(`${table}.${column} = :packageId`, { packageId })
        .getRawOne<{ count: string }>();
      return Number(row?.count ?? 0);
    } catch (error) {
      if ((error as { code?: string; errno?: number }).code === 'ER_NO_SUCH_TABLE' || (error as { errno?: number }).errno === 1146) {
        return 0;
      }
      throw error;
    }
  }

  private parseFacilityIds(value: unknown): string[] {
    if (!value) {
      return [];
    }
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
