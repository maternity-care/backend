import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { SearchPackageServiceDto } from '../dto/requests/search-package-service.dto';
import { PackageServiceResponseDto } from '../dto/responses/package-service-response.dto';
import { PackageItem } from '../entities/package-item.entity';
import {
  IPackageServicesRepository,
  PackageServiceWithDetails,
} from '../interfaces/package-services-repository.interface';

@Injectable()
export class PackageServicesRepository implements IPackageServicesRepository {
  constructor(
    @InjectRepository(PackageItem)
    private readonly repository: Repository<PackageItem>,
  ) {}

  create(data: DeepPartial<PackageItem>): PackageItem {
    return this.repository.create(data);
  }

  save(entity: PackageItem): Promise<PackageItem> {
    return this.repository.save(entity);
  }

  saveWithFacilities(entity: PackageItem, _facilityIds?: string[]): Promise<PackageItem> {
    return this.repository.save(entity);
  }

  async replaceFacilities(_packageServiceId: string, _facilityIds: string[]): Promise<void> {
    // Schema hiện tại không có bảng package_service_facilities, nên scope theo facility được biểu diễn qua facilityServiceId.
  }

  async remove(entity: PackageItem): Promise<void> {
    await this.repository.remove(entity);
  }

  findById(id: string): Promise<PackageItem | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findDetailsById(id: string): Promise<PackageServiceWithDetails | null> {
    const row = await this.buildDetailsQuery()
      .where('packageItem.id = :id', { id })
      .getRawOne<Record<string, unknown>>();
    return row ? this.mapRow(row) : null;
  }

  findByPackageAndService(packageId: string, facilityServiceId: string): Promise<PackageItem | null> {
    return this.repository.findOne({ where: { packageId, facilityServiceId } });
  }

  async findAll(filters?: SearchPackageServiceDto): Promise<PackageServiceWithDetails[]> {
    const rows = await this.buildListQuery(filters).getRawMany<Record<string, unknown>>();
    return rows.map(row => this.mapRow(row));
  }

  async findFacilityIds(_packageServiceId: string): Promise<string[]> {
    return [];
  }

  async countGeneratedBenefits(packageId: string, facilityServiceId: string): Promise<number> {
    try {
      const row = await this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('patient_package_benefits', 'benefit')
        .innerJoin('package_items', 'packageItem', 'packageItem.package_id = benefit.package_id')
        .where('benefit.package_id = :packageId', { packageId })
        .andWhere('packageItem.facility_service_id = :facilityServiceId', { facilityServiceId })
        .getRawOne<{ count: string }>();
      return Number(row?.count ?? 0);
    } catch (error) {
      if ((error as { code?: string; errno?: number }).code === 'ER_NO_SUCH_TABLE' || (error as { errno?: number }).errno === 1146) {
        return 0;
      }
      throw error;
    }
  }

  async findAllPaginated(
    filters?: SearchPackageServiceDto,
  ): Promise<PaginationResult<PackageServiceWithDetails>> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const query = this.buildListQuery(filters);
    const total = await query.clone().getCount();
    const rows = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<Record<string, unknown>>();

    return {
      items: rows.map(row => this.mapRow(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private buildListQuery(filters?: SearchPackageServiceDto): SelectQueryBuilder<PackageItem> {
    const query = this.buildDetailsQuery()
      .orderBy('packageItem.sortOrder', 'ASC')
      .addOrderBy('packageItem.id', 'ASC');

    if (filters?.packageId) {
      query.andWhere('packageItem.packageId = :packageId', { packageId: filters.packageId });
    }
    if (filters?.facilityServiceId) {
      query.andWhere('packageItem.facilityServiceId = :facilityServiceId', {
        facilityServiceId: filters.facilityServiceId,
      });
    }
    if (filters?.serviceType) {
      query.andWhere('service.service_type = :serviceType', { serviceType: filters.serviceType });
    }
    if (filters?.allowedFacilityScope) {
      query.andWhere('packageItem.allowedFacilityScope = :allowedFacilityScope', {
        allowedFacilityScope: filters.allowedFacilityScope,
      });
    }
    if (filters?.search) {
      query.andWhere(
        '(LOWER(service.code) LIKE LOWER(:search) OR LOWER(service.name) LIKE LOWER(:search) OR LOWER(service.description) LIKE LOWER(:search) OR LOWER(pkg.code) LIKE LOWER(:search) OR LOWER(pkg.name) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }

  private buildDetailsQuery(): SelectQueryBuilder<PackageItem> {
    return this.repository
      .createQueryBuilder('packageItem')
      .innerJoin('maternity_packages', 'pkg', 'pkg.id = packageItem.packageId')
      .innerJoin('facility_services', 'facilityService', 'facilityService.id = packageItem.facilityServiceId')
      .innerJoin('services', 'service', 'service.id = facilityService.service_id')
      .select('packageItem.id', 'id')
      .addSelect('packageItem.packageId', 'packageId')
      .addSelect('packageItem.facilityServiceId', 'facilityServiceId')
      .addSelect('packageItem.includedQuantity', 'includedQuantity')
      .addSelect('packageItem.isRequired', 'isRequired')
      .addSelect('packageItem.isOptional', 'isOptional')
      .addSelect('packageItem.allowedFacilityScope', 'allowedFacilityScope')
      .addSelect('packageItem.sortOrder', 'sortOrder')
      .addSelect('packageItem.createdAt', 'createdAt')
      .addSelect('packageItem.updatedAt', 'updatedAt')
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

  private mapRow(row: Record<string, unknown>): PackageServiceResponseDto {
    return {
      id: String(row.id),
      packageId: String(row.packageId),
      facilityServiceId: String(row.facilityServiceId),
      includedQuantity: Number(row.includedQuantity),
      isRequired: row.isRequired as number,
      isOptional: row.isOptional as number,
      allowedFacilityScope: String(row.allowedFacilityScope),
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      packageCode: row.packageCode as string,
      packageName: row.packageName as string,
      packagePrice: row.packagePrice as string,
      packageStatus: row.packageStatus as string,
      serviceCode: row.serviceCode as string,
      serviceName: row.serviceName as string,
      serviceDescription: row.serviceDescription as string | null,
      serviceType: row.serviceType as string,
      serviceBasePrice: row.serviceBasePrice as string,
      facilityIds: [],
    };
  }
}
