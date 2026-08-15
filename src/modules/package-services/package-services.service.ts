import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ActiveStatus, MaternityPackageStatus } from '../../common/constants/status.enum';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { MaternityPackagesService } from '../maternity-packages/maternity-packages.service';
import { FacilityServicesService } from '../facility-services/facility-services.service';
import {
  BulkCreatePackageServicesDto,
  CreatePackageServiceDto,
  PackageServiceFacilityScope,
  PackageServiceItemInputDto,
} from './dto/requests/create-package-service.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { UpdatePackageServiceDto } from './dto/requests/update-package-service.dto';
import { PackageItem } from './entities/package-item.entity';
import {
  IPackageServicesRepository,
  PACKAGE_SERVICES_REPOSITORY,
} from './interfaces/package-services-repository.interface';

@Injectable()
export class PackageServicesService {
  constructor(
    @Inject(PACKAGE_SERVICES_REPOSITORY)
    private readonly repository: IPackageServicesRepository,
    private readonly maternityPackagesService: MaternityPackagesService,
    private readonly facilityServicesService: FacilityServicesService,
    @Optional()
    private readonly facilitiesService?: { findById(id: string): Promise<{ status?: string }> },
  ) {}

  async create(dto: CreatePackageServiceDto): Promise<PackageItem> {
    const pkg = await this.validatePackage(dto.packageId);
    await this.validateServiceReference(dto.facilityServiceId, pkg.facilityId);
    await this.ensureUniquePair(dto.packageId, dto.facilityServiceId);
    this.validateClassification(dto.isRequired, dto.isOptional);

    const facilityIds = await this.resolveFacilityIds(dto, pkg.facilityId);
    const entity = this.repository.create({
      ...dto,
      isRequired: dto.isRequired ? 1 : 0,
      isOptional: dto.isOptional ? 1 : 0,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.repository.saveWithFacilities(entity, facilityIds);
  }

  async bulkCreate(dto: BulkCreatePackageServicesDto) {
    const pkg = await this.validatePackage(dto.packageId);
    this.ensureNoDuplicatedFacilityServiceInPayload(dto.services);

    const entities: PackageItem[] = [];
    const facilityIdsByFacilityServiceId = new Map<string, string[]>();
    for (const [index, item] of dto.services.entries()) {
      this.validateClassification(item.isRequired, item.isOptional);
      await this.validateServiceReference(item.facilityServiceId, pkg.facilityId);
      await this.ensureUniquePair(dto.packageId, item.facilityServiceId);
      const facilityIds = await this.resolveFacilityIds(item, pkg.facilityId);
      facilityIdsByFacilityServiceId.set(item.facilityServiceId, facilityIds);

      entities.push(this.repository.create({
        ...item,
        packageId: dto.packageId,
        isRequired: item.isRequired ? 1 : 0,
        isOptional: item.isOptional ? 1 : 0,
        sortOrder: item.sortOrder ?? index + 1,
      }));
    }

    const saved = await this.repository.saveManyWithFacilities(entities);
    await Promise.all(
      saved.map((item) =>
        this.repository.replaceFacilities(
          item.id,
          facilityIdsByFacilityServiceId.get(item.facilityServiceId) ?? [],
        ),
      ),
    );
    return Promise.all(saved.map((item) => this.findDetailsById(item.id)));
  }

  async findAll(filters?: SearchPackageServiceDto) {
    const rows = await this.repository.findAll(filters);
    this.ensureRowsFound(rows);
    return rows;
  }

  async findAllPaginated(filters?: SearchPackageServiceDto) {
    const result = await this.repository.findAllPaginated(filters);
    this.ensureRowsFound(result.items);
    return result;
  }

  async findById(id: string): Promise<PackageItem> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(PACKAGE_SERVICE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  async findDetailsById(id: string) {
    const entity = await this.repository.findDetailsById(id);
    if (!entity) {
      throw new NotFoundException(PACKAGE_SERVICE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  async findDetailsByPackageId(packageId: string) {
    const rows = typeof this.repository.findDetailsByPackageId === 'function'
      ? await this.repository.findDetailsByPackageId(packageId)
      : await this.repository.findAll({ packageId });
    this.ensureRowsFound(rows);
    return rows;
  }

  async update(id: string, dto: UpdatePackageServiceDto): Promise<PackageItem> {
    const entity = await this.findById(id);
    const nextPackageId = dto.packageId ?? entity.packageId;
    const nextFacilityServiceId = dto.facilityServiceId ?? entity.facilityServiceId;

    if (dto.packageId || dto.facilityServiceId) {
      const pkg = await this.validatePackage(nextPackageId);
      await this.validateServiceReference(nextFacilityServiceId, pkg.facilityId);
      await this.ensureUniquePair(nextPackageId, nextFacilityServiceId, entity.id);
    }

    const classification = this.resolveClassification(entity, dto);

    Object.assign(entity, {
      ...dto,
      packageId: nextPackageId,
      facilityServiceId: nextFacilityServiceId,
      ...classification,
    });

    const pkg = await this.validatePackage(nextPackageId);
    const facilityIds = await this.resolveFacilityIds(entity as never, pkg.facilityId, entity.id);
    return this.repository.saveWithFacilities(entity, facilityIds);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findById(id);
    const generatedBenefits = await this.repository.countGeneratedBenefits(
      entity.packageId,
      entity.facilityServiceId,
    );

    if (generatedBenefits > 0) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.CANNOT_DELETE_USED_PACKAGE_SERVICE);
    }

    await this.repository.remove(entity);
  }

  private async validatePackage(packageId: string) {
    const pkg = await this.maternityPackagesService.findById(packageId);
    if (pkg.status === MaternityPackageStatus.INACTIVE) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.PACKAGE_INACTIVE);
    }
    return pkg;
  }

  private async validateServiceReference(facilityServiceId: string, packageFacilityId: string): Promise<void> {
    const facilityService = await this.facilityServicesService.findDetailsById(facilityServiceId);
    if (facilityService.facilityId !== packageFacilityId) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_NOT_IN_PACKAGE_FACILITY);
    }
    if (facilityService.status !== ActiveStatus.ACTIVE) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.FACILITY_SERVICE_INACTIVE);
    }
    if (facilityService.service.status !== ActiveStatus.ACTIVE) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SERVICE_INACTIVE);
    }
  }

  private async ensureUniquePair(
    packageId: string,
    facilityServiceId: string,
    currentId?: string,
  ): Promise<void> {
    const duplicated = await this.repository.findByPackageAndService(packageId, facilityServiceId);
    if (duplicated && duplicated.id !== currentId) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.ALREADY_EXISTS);
    }
  }

  private async resolveFacilityIds(
    dto: Partial<CreatePackageServiceDto>,
    packageFacilityId: string,
    packageServiceId?: string,
  ): Promise<string[]> {
    if (dto.allowedFacilityScope !== PackageServiceFacilityScope.SELECTED) {
      return [];
    }

    if (dto.facilityIds && dto.facilityIds.length > 0) {
      await this.validateSelectedFacilities(dto.facilityIds, packageFacilityId);
      return dto.facilityIds;
    }

    if (packageServiceId) {
      return this.repository.findFacilityIds(packageServiceId);
    }

    throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED);
  }

  private async validateSelectedFacilities(facilityIds: string[], packageFacilityId: string): Promise<void> {
    if (facilityIds.some((facilityId) => facilityId !== packageFacilityId)) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_NOT_IN_PACKAGE_FACILITY);
    }

    if (!this.facilitiesService) {
      return;
    }

    for (const facilityId of facilityIds) {
      const facility = await this.facilitiesService.findById(facilityId);
      if (facility.status !== 'active') {
        throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED);
      }
    }
  }

  private ensureRowsFound(rows?: unknown[] | null): void {
    if (!rows || rows.length === 0) {
      throw new NotFoundException(PACKAGE_SERVICE_CONSTANT.NOT_FOUND);
    }
  }

  private ensureNoDuplicatedFacilityServiceInPayload(
    services: PackageServiceItemInputDto[],
  ): void {
    const ids = new Set<string>();
    for (const item of services) {
      if (ids.has(item.facilityServiceId)) {
        throw new ConflictException(PACKAGE_SERVICE_CONSTANT.BULK_DUPLICATED_IN_PAYLOAD);
      }
      ids.add(item.facilityServiceId);
    }
  }

  /** Một dịch vụ trong gói chỉ có thể thuộc đúng một loại: bắt buộc hoặc tùy chọn. */
  private validateClassification(isRequired: boolean, isOptional: boolean): void {
    if (isRequired === isOptional) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.CLASSIFICATION_INVALID);
    }
  }

  /** Giữ tương thích API cập nhật một phần và tự đảo giá trị còn lại của công tắc. */
  private resolveClassification(
    entity: PackageItem,
    dto: UpdatePackageServiceDto,
  ): Pick<PackageItem, 'isRequired' | 'isOptional'> {
    const currentRequired = Boolean(entity.isRequired);
    const currentOptional = Boolean(entity.isOptional);
    const isRequired = dto.isRequired
      ?? (dto.isOptional === undefined ? currentRequired : !dto.isOptional);
    const isOptional = dto.isOptional
      ?? (dto.isRequired === undefined ? currentOptional : !dto.isRequired);

    this.validateClassification(isRequired, isOptional);
    return {
      isRequired: isRequired ? 1 : 0,
      isOptional: isOptional ? 1 : 0,
    };
  }
}
