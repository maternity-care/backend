import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import {
  ActiveStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../common/constants/status.enum';
import { PackageService } from './entities/package-services.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import { MaternityPackagesService } from '../maternity-packages/maternity-packages.service';
import { ServicesService } from '../services/services.service';
import {
  CreatePackageServiceDto,
  PackageServiceFacilityScope,
} from './dto/requests/create-package-service.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { UpdatePackageServiceDto } from './dto/requests/update-package-service.dto';
import {
  IPackageServicesRepository,
  PACKAGE_SERVICES_REPOSITORY,
  PackageServiceWithDetails,
} from './interfaces/package-services-repository.interface';

@Injectable()
export class PackageServicesService {
  constructor(
    @Inject(PACKAGE_SERVICES_REPOSITORY)
    private readonly repository: IPackageServicesRepository,
    private readonly maternityPackagesService: MaternityPackagesService,
    private readonly servicesService: ServicesService,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  // Thêm một service gốc vào một gói, kèm số lần sử dụng và phạm vi facility được dùng.
  async create(dto: CreatePackageServiceDto): Promise<PackageService> {
    await this.validatePackageAndService(dto.packageId, dto.serviceId);
    await this.validateScope(dto.allowedFacilityScope, dto.facilityIds);

    if (await this.repository.findByPackageAndService(dto.packageId, dto.serviceId)) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.ALREADY_EXISTS);
    }

    const entity = this.repository.create({
      packageId: dto.packageId,
      serviceId: dto.serviceId,
      includedQuantity: dto.includedQuantity,
      isRequired: dto.isRequired ? 1 : 0,
      isOptional: dto.isOptional ? 1 : 0,
      allowedFacilityScope: dto.allowedFacilityScope,
    });

    return this.repository.saveWithFacilities(entity, dto.facilityIds);
  }

  // List cấu hình service trong gói cho management.
  async findAll(filters?: SearchPackageServiceDto): Promise<PackageServiceWithDetails[]> {
    const packageServices = await this.repository.findAll(filters);
    this.ensurePackageServicesFound(packageServices);
    return packageServices;
  }

  // List có phân trang.
  async findAllPaginated(filters?: SearchPackageServiceDto) {
    const result = await this.repository.findAllPaginated(filters);
    this.ensurePackageServicesFound(result.items);
    return result;
  }

  // List service con của một package kèm thông tin service gốc và facilityIds.
  async findDetailsByPackageId(packageId: string, filters?: SearchPackageServiceDto) {
    const packageServices = await this.repository.findDetailsByPackageId(packageId, filters);
    this.ensurePackageServicesFound(packageServices);
    return packageServices;
  }

  // Lấy detail một package service.
  async findById(id: string): Promise<PackageService> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(PACKAGE_SERVICE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  async findDetailsById(id: string): Promise<PackageServiceWithDetails> {
    const entity = await this.repository.findDetailsById(id);
    if (!entity) {
      throw new NotFoundException(PACKAGE_SERVICE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  // Cập nhật số lần dùng, required/optional hoặc scope facility của service trong gói.
  async update(id: string, dto: UpdatePackageServiceDto): Promise<PackageService> {
    const entity = await this.findById(id);
    const nextPackageId = dto.packageId ?? entity.packageId;
    const nextServiceId = dto.serviceId ?? entity.serviceId;
    const nextScope = dto.allowedFacilityScope ?? entity.allowedFacilityScope as PackageServiceFacilityScope;

    if (dto.packageId || dto.serviceId) {
      await this.validatePackageAndService(nextPackageId, nextServiceId);
      const duplicated = await this.repository.findByPackageAndService(nextPackageId, nextServiceId);
      if (duplicated && duplicated.id !== entity.id) {
        throw new ConflictException(PACKAGE_SERVICE_CONSTANT.ALREADY_EXISTS);
      }
    }

    const nextFacilityIds = dto.facilityIds ?? await this.repository.findFacilityIds(entity.id);
    await this.validateScope(nextScope, nextFacilityIds);

    Object.assign(entity, {
      packageId: nextPackageId,
      serviceId: nextServiceId,
      includedQuantity: dto.includedQuantity ?? entity.includedQuantity,
      isRequired: dto.isRequired === undefined ? entity.isRequired : dto.isRequired ? 1 : 0,
      isOptional: dto.isOptional === undefined ? entity.isOptional : dto.isOptional ? 1 : 0,
      allowedFacilityScope: nextScope,
    });

    return this.repository.saveWithFacilities(entity, nextFacilityIds);
  }

  // Xóa service khỏi gói. Nếu đã copy thành quyền lợi cho bệnh nhân thì không cho xóa.
  async remove(id: string): Promise<void> {
    const entity = await this.findById(id);
    const generatedBenefitCount = await this.repository.countGeneratedBenefits(entity.packageId, entity.serviceId);
    if (generatedBenefitCount > 0) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.CANNOT_DELETE_USED_PACKAGE_SERVICE);
    }
    await this.repository.remove(entity);
  }

  // Package có thể draft hoặc active để cấu hình. Inactive thì không nên chỉnh cấu hình.
  private async validatePackageAndService(packageId: string, serviceId: string): Promise<void> {
    const [pkg, service] = await Promise.all([
      this.maternityPackagesService.findById(packageId),
      this.servicesService.findById(serviceId),
    ]);

    if (pkg.status === MaternityPackageStatus.INACTIVE) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.PACKAGE_INACTIVE);
    }
    if (service.status !== ActiveStatus.ACTIVE) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SERVICE_INACTIVE);
    }
  }

  // Scope selected bắt buộc có facilityIds và từng facility phải active.
  private async validateScope(
    scope: PackageServiceFacilityScope | string,
    facilityIds?: string[],
  ): Promise<void> {
    if (scope === PackageServiceFacilityScope.ALL) return;

    if (!facilityIds || facilityIds.length === 0) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED);
    }

    const facilities = await Promise.all(facilityIds.map(id => this.facilitiesService.findById(id)));
    if (facilities.some(facility => facility.status !== FacilityStatus.ACTIVE)) {
      throw new ConflictException(PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED);
    }
  }

  private ensurePackageServicesFound(packageServices?: unknown[] | null): void {
    if (!packageServices || packageServices.length === 0) {
      throw new NotFoundException(PACKAGE_SERVICE_CONSTANT.NOT_FOUND);
    }
  }
}
