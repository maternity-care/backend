import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ActiveStatus, MaternityPackageStatus } from '../../common/constants/status.enum';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import { MaternityPackagesService } from '../maternity-packages/maternity-packages.service';
import { ServicesService } from '../services/services.service';
import { CreatePackageServiceDto, PackageServiceFacilityScope } from './dto/requests/create-package-service.dto';
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
    @Optional()
    private readonly servicesService?: ServicesService,
    @Optional()
    private readonly facilitiesService?: { findById(id: string): Promise<{ status?: string }> },
  ) {}

  async create(dto: CreatePackageServiceDto): Promise<PackageItem> {
    await this.validatePackage(dto.packageId);
    await this.validateServiceReference(dto.facilityServiceId);
    await this.ensureUniquePair(dto.packageId, dto.facilityServiceId);

    const facilityIds = await this.resolveFacilityIds(dto);
    const entity = this.repository.create({
      ...dto,
      isRequired: dto.isRequired ? 1 : 0,
      isOptional: dto.isOptional ? 1 : 0,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.repository.saveWithFacilities(entity, facilityIds);
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
      await this.validatePackage(nextPackageId);
      await this.validateServiceReference(nextFacilityServiceId);
      await this.ensureUniquePair(nextPackageId, nextFacilityServiceId, entity.id);
    }

    Object.assign(entity, {
      ...dto,
      packageId: nextPackageId,
      facilityServiceId: nextFacilityServiceId,
      ...(dto.isRequired === undefined ? {} : { isRequired: dto.isRequired ? 1 : 0 }),
      ...(dto.isOptional === undefined ? {} : { isOptional: dto.isOptional ? 1 : 0 }),
    });

    const facilityIds = await this.resolveFacilityIds(entity as never, entity.id);
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

  private async validatePackage(packageId: string): Promise<void> {
    const pkg = await this.maternityPackagesService.findById(packageId);
    if (pkg.status === MaternityPackageStatus.INACTIVE) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.PACKAGE_INACTIVE);
    }
  }

  private async validateServiceReference(facilityServiceId: string): Promise<void> {
    if (this.servicesService && typeof this.servicesService.findById === 'function') {
      const service = await this.servicesService.findById(facilityServiceId);
      if (service.status !== ActiveStatus.ACTIVE) {
        throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SERVICE_INACTIVE);
      }
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
    packageServiceId?: string,
  ): Promise<string[]> {
    if (dto.allowedFacilityScope !== PackageServiceFacilityScope.SELECTED) {
      return [];
    }

    if (dto.facilityIds && dto.facilityIds.length > 0) {
      await this.validateSelectedFacilities(dto.facilityIds);
      return dto.facilityIds;
    }

    if (packageServiceId) {
      return this.repository.findFacilityIds(packageServiceId);
    }

    throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED);
  }

  private async validateSelectedFacilities(facilityIds: string[]): Promise<void> {
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
}
