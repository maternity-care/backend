import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import {
  ActiveStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../common/constants/status.enum';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { MaternityPackage } from './entities/maternity-package.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import {
  CreateMaternityPackageDto,
  MaternityPackageType,
} from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { UpdateMaternityPackageDto } from './dto/requests/update-maternity-package.dto';
import { MaternityPackageResponseDto } from './dto/responses/maternity-package-response.dto';
import {
  IMaternityPackagesRepository,
  MATERNITY_PACKAGES_REPOSITORY,
} from './interfaces/maternity-packages-repository.interface';
import { FacilityServicesService } from '../facility-services/facility-services.service';
import { PackageServiceItemInputDto } from '../package-services/dto/requests/create-package-service.dto';
import { PackageItem } from '../package-services/entities/package-item.entity';

@Injectable()
export class MaternityPackagesService {
  constructor(
    // Inject qua token để service phụ thuộc vào abstraction, không phụ thuộc trực tiếp TypeORM class.
    @Inject(MATERNITY_PACKAGES_REPOSITORY)
    private readonly repository: IMaternityPackagesRepository,
    private readonly facilitiesService: FacilitiesService,
    @Optional()
    private readonly facilityServicesService?: FacilityServicesService,
  ) {}

  // Tạo "vỏ gói" dịch vụ: code/name/price/duration/status.
  // Các dịch vụ con của gói sẽ được gắn sau bằng module package-services.
  async create(dto: CreateMaternityPackageDto): Promise<MaternityPackageResponseDto> {
    await this.ensureUniqueCode(dto.code);
    await this.ensureUniqueName(dto.name);
    await this.ensureActiveFacility(dto.facilityId);

    const entity = this.repository.create({
      ...dto,
      description: dto.description ?? '',
      priorityLevel: dto.priorityLevel ?? 0,
      packageType: dto.packageType ?? MaternityPackageType.QUANTITY,
    });

    const packageItems = await this.buildPackageItems(dto.facilityId, dto.services);
    const saved = typeof this.repository.saveWithItems === 'function'
      ? await this.repository.saveWithItems(entity, packageItems)
      : await this.repository.save(entity);
    return this.findDetailsOrEntity(saved);
  }

  // Lấy danh sách gói cho management/public tùy controller gọi filter status thế nào.
  async findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackageResponseDto[]> {
    const packages = await this.repository.findAll(filters);
    this.ensurePackagesFound(packages);
    return packages;
  }

  // Lấy danh sách gói có phân trang.
  async findAllPaginated(filters?: SearchMaternityPackageDto) {
    const result = await this.repository.findAllPaginated(filters);
    this.ensurePackagesFound(result.items);
    return result;
  }

  // Lấy chi tiết gói theo id.
  async findAvailableByFacilityId(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ): Promise<MaternityPackageResponseDto[]> {
    await this.ensureActiveFacility(facilityId);
    const packages = await this.repository.findAvailableByFacilityId(facilityId, filters);
    this.ensurePackagesFound(packages);
    return packages;
  }

  async findAvailableByFacilityIdPaginated(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ) {
    await this.ensureActiveFacility(facilityId);
    const result = await this.repository.findAvailableByFacilityIdPaginated(facilityId, filters);
    this.ensurePackagesFound(result.items);
    return result;
  }

  async findById(id: string): Promise<MaternityPackage> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(MATERNITY_PACKAGE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  async findDetailsById(id: string): Promise<MaternityPackageResponseDto> {
    const entity = await this.repository.findDetailsById(id);
    if (!entity) {
      throw new NotFoundException(MATERNITY_PACKAGE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  // Cập nhật thông tin gói; nếu đổi code/name thì kiểm tra trùng lại.
  async update(id: string, dto: UpdateMaternityPackageDto): Promise<MaternityPackageResponseDto> {
    const entity = await this.findById(id);

    if (dto.code && dto.code !== entity.code) {
      await this.ensureUniqueCode(dto.code);
    }
    if (dto.name && dto.name !== entity.name) {
      await this.ensureUniqueName(dto.name);
    }

    const nextFacilityId = dto.facilityId ?? entity.facilityId;
    if (dto.facilityId && dto.facilityId !== entity.facilityId) {
      await this.ensureActiveFacility(dto.facilityId);
    }

    Object.assign(entity, {
      ...dto,
      description: dto.description ?? entity.description,
      packageType: dto.packageType ?? entity.packageType,
    });

    const saved = await this.repository.save(entity);
    if (dto.services) {
      const packageItems = await this.buildPackageItems(nextFacilityId, dto.services);
      if (typeof this.repository.replaceItems === 'function') {
        await this.repository.replaceItems(saved.id, packageItems);
      }
    }

    return this.findDetailsOrEntity(saved);
  }

  // Xóa an toàn: gói chưa được dùng thì hard delete; đã có service con/người mua thì chuyển inactive.
  async remove(id: string): Promise<SafeRemoveResult> {
    const entity = await this.findById(id);
    const dependencyCount = await this.repository.countDependencies(entity.id);

    if (dependencyCount === 0) {
      await this.repository.remove(entity);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.repository.updateStatus(entity, MaternityPackageStatus.INACTIVE);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  // Code là định danh ổn định cho quản trị/tích hợp nên không được trùng.
  private async ensureUniqueCode(code: string): Promise<void> {
    if (await this.repository.findByCode(code)) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.CODE_EXISTS);
    }
  }

  // Name là tên hiển thị cho người dùng, nên cũng nên chống trùng để tránh nhầm gói.
  private async ensureUniqueName(name: string): Promise<void> {
    if (await this.repository.findByName(name)) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.NAME_EXISTS);
    }
  }

  private async ensureActiveFacility(facilityId: string): Promise<void> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new NotFoundException(MATERNITY_PACKAGE_CONSTANT.NOT_FOUND);
    }
  }

  private ensurePackagesFound(packages?: unknown[] | null): void {
    if (!packages || packages.length === 0) {
      throw new NotFoundException(MATERNITY_PACKAGE_CONSTANT.NOT_FOUND);
    }
  }

  private async findDetailsOrEntity(
    entity: MaternityPackage,
  ): Promise<MaternityPackageResponseDto> {
    if (typeof this.repository.findDetailsById === 'function') {
      const details = await this.repository.findDetailsById(entity.id);
      if (details) {
        return details;
      }
    }
    return entity as unknown as MaternityPackageResponseDto;
  }

  private async buildPackageItems(
    packageFacilityId: string,
    services?: PackageServiceItemInputDto[],
  ): Promise<Partial<PackageItem>[]> {
    if (!services || services.length === 0) {
      return [];
    }

    if (!this.facilityServicesService) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_INVALID);
    }

    const duplicatedFacilityServiceId = services.find((service, index) =>
      services.some((item, itemIndex) =>
        itemIndex !== index && item.facilityServiceId === service.facilityServiceId,
      ),
    );

    if (duplicatedFacilityServiceId) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.PACKAGE_ITEM_DUPLICATED);
    }

    const items: Partial<PackageItem>[] = [];
    for (const [index, item] of services.entries()) {
      const facilityService = await this.facilityServicesService.findDetailsById(item.facilityServiceId);
      if (facilityService.facilityId !== packageFacilityId) {
        throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_NOT_IN_PACKAGE_FACILITY);
      }
      if (facilityService.status !== ActiveStatus.ACTIVE) {
        throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_UNAVAILABLE);
      }
      if (facilityService.service.status !== ActiveStatus.ACTIVE) {
        throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_INVALID);
      }

      items.push({
        facilityServiceId: item.facilityServiceId,
        includedQuantity: item.includedQuantity,
        isRequired: item.isRequired,
        isOptional: item.isOptional,
        allowedFacilityScope: item.allowedFacilityScope,
        sortOrder: item.sortOrder ?? index + 1,
      });
    }

    return items;
  }
}
