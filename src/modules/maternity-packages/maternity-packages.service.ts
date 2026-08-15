import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import {
  ActiveStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../common/constants/status.enum';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import {
  buildCodePrefixFromName,
  buildNextCodeFromExisting,
} from '../../common/helpers/code-generator.helper';
import { FacilitiesService } from '../facilities/facilities.service';
import { FacilityServicesService } from '../facility-services/facility-services.service';
import { PackageServiceFacilityScope } from '../package-services/dto/requests/create-package-service.dto';
import { PackageItem } from '../package-services/entities/package-item.entity';
import {
  CreateMaternityPackageDto,
  CreateQuantityMaternityPackageDto,
  CreateScheduleMaternityPackageDto,
  MaternityPackageStageInputDto,
  MaternityPackageStageType,
  MaternityPackageServiceInputDto,
  MaternityPackageType,
} from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { UpdateMaternityPackageDto } from './dto/requests/update-maternity-package.dto';
import { MaternityPackageResponseDto } from './dto/responses/maternity-package-response.dto';
import { MaternityPackage } from './entities/maternity-package.entity';
import {
  IMaternityPackagesRepository,
  MATERNITY_PACKAGES_REPOSITORY,
  PackageStageWithItemsInput,
} from './interfaces/maternity-packages-repository.interface';

@Injectable()
export class MaternityPackagesService {
  constructor(
    @Inject(MATERNITY_PACKAGES_REPOSITORY)
    private readonly repository: IMaternityPackagesRepository,
    private readonly facilitiesService: FacilitiesService,
    @Optional()
    private readonly facilityServicesService?: FacilityServicesService,
  ) {}

  // Tạo gói thai sản và gắn luôn dịch vụ trong một API.
  // packageType=quantity dùng services[] ở root; packageType=schedule dùng stages[].services[].
  async create(dto: CreateMaternityPackageDto): Promise<MaternityPackageResponseDto> {
    await this.ensureActiveFacility(dto.facilityId);
    await this.ensureUniqueName(dto.facilityId, dto.name);
    const code = await this.generateCode(dto.facilityId, dto.name);

    const packageType = dto.packageType ?? MaternityPackageType.QUANTITY;
    this.ensureValidPackageStructure(packageType, dto);

    const { services: _ignoredServices, stages: _ignoredStages, ...packagePayload } = dto;
    const entity = this.repository.create({
      ...packagePayload,
      code,
      description: dto.description ?? '',
      priorityLevel: dto.priorityLevel ?? 0,
      packageType,
    });

    const saved = packageType === MaternityPackageType.SCHEDULE
      ? await this.repository.saveWithStagesAndItems(
        entity,
        await this.buildPackageStages(dto.facilityId, dto.stages),
      )
      : await this.repository.saveWithItems(
        entity,
        await this.buildPackageItems(dto.facilityId, dto.services),
      );

    return this.findDetailsOrEntity(saved);
  }

  // Tao goi theo so luot: FE khong can gui packageType, BE tu gan packageType = quantity.
  async createQuantity(dto: CreateQuantityMaternityPackageDto): Promise<MaternityPackageResponseDto> {
    return this.create({
      ...dto,
      packageType: MaternityPackageType.QUANTITY,
    });
  }

  // Tao goi theo lich trinh/tuan tu: FE khong can gui packageType, BE tu gan packageType = schedule.
  async createSchedule(dto: CreateScheduleMaternityPackageDto): Promise<MaternityPackageResponseDto> {
    return this.create({
      ...dto,
      packageType: MaternityPackageType.SCHEDULE,
    });
  }

  async findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackageResponseDto[]> {
    return this.repository.findAll(filters);
  }

  async findAllPaginated(filters?: SearchMaternityPackageDto) {
    return this.repository.findAllPaginated(filters);
  }

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

  async update(id: string, dto: UpdateMaternityPackageDto): Promise<MaternityPackageResponseDto> {
    const entity = await this.findById(id);
    const nextFacilityId = dto.facilityId ?? entity.facilityId;
    const nextPackageType = dto.packageType ?? entity.packageType;

    if (dto.facilityId && dto.facilityId !== entity.facilityId) {
      await this.ensureActiveFacility(dto.facilityId);
    }

    if ((dto.name && dto.name !== entity.name) || nextFacilityId !== entity.facilityId) {
      await this.ensureUniqueName(nextFacilityId, dto.name ?? entity.name, entity.id);
    }

    const {
      services: _ignoredServices,
      stages: _ignoredStages,
      ...packagePayload
    } = dto;
    Object.assign(entity, {
      ...packagePayload,
      description: dto.description ?? entity.description,
      packageType: nextPackageType,
    });

    const saved = await this.repository.save(entity);
    if (dto.services !== undefined || dto.stages !== undefined || dto.packageType !== undefined) {
      this.ensureValidPackageStructure(nextPackageType, {
        ...dto,
        services: dto.services,
        stages: dto.stages,
      });

      if (nextPackageType === MaternityPackageType.SCHEDULE) {
        await this.repository.replaceStagesAndItems(
          saved.id,
          await this.buildPackageStages(nextFacilityId, dto.stages),
        );
      } else {
        await this.repository.replaceItems(
          saved.id,
          await this.buildPackageItems(nextFacilityId, dto.services),
        );
      }
    }

    return this.findDetailsOrEntity(saved);
  }

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

  private ensureValidPackageStructure(
    packageType: MaternityPackageType | string,
    dto: Pick<CreateMaternityPackageDto, 'services' | 'stages'>,
  ): void {
    if (packageType === MaternityPackageType.SCHEDULE) {
      if (dto.services && dto.services.length > 0) {
        throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.SCHEDULE_ROOT_SERVICES_INVALID);
      }
      if (!dto.stages || dto.stages.length === 0) {
        throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.SCHEDULE_STAGES_REQUIRED);
      }
      for (const stage of dto.stages) {
        this.ensureValidStage(stage);
      }
      return;
    }

    if (dto.stages && dto.stages.length > 0) {
      throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.QUANTITY_STAGES_INVALID);
    }

    if (!dto.services || dto.services.length === 0) {
      throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.QUANTITY_SERVICES_REQUIRED);
    }
  }

  private ensureValidStage(stage: MaternityPackageStageInputDto): void {
    if (!stage.services || stage.services.length === 0) {
      throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.STAGE_SERVICES_REQUIRED);
    }

    const stageType = stage.stageType ?? MaternityPackageStageType.PREGNANCY_WEEK;
    if (stageType === MaternityPackageStageType.PREGNANCY_WEEK) {
      if (!stage.weekFrom || !stage.weekTo) {
        throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_REQUIRED);
      }
      if (stage.weekFrom > stage.weekTo) {
        throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_RANGE_INVALID);
      }
    }
  }

  private async generateCode(facilityId: string, name: string): Promise<string> {
    const prefix = buildCodePrefixFromName(name, 'PACKAGE');
    const existingCodes = await this.repository.findCodesByFacilityAndPrefix(facilityId, prefix);
    return buildNextCodeFromExisting(prefix, existingCodes);
  }

  private async ensureUniqueName(facilityId: string, name: string, currentId?: string): Promise<void> {
    const duplicated = await this.repository.findByFacilityAndName(facilityId, name);
    if (duplicated && duplicated.id !== currentId) {
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

  private async findDetailsOrEntity(entity: MaternityPackage): Promise<MaternityPackageResponseDto> {
    if (typeof this.repository.findDetailsById === 'function') {
      const details = await this.repository.findDetailsById(entity.id);
      if (details) {
        return details;
      }
    }
    return entity as unknown as MaternityPackageResponseDto;
  }

  private async buildPackageStages(
    packageFacilityId: string,
    stages?: MaternityPackageStageInputDto[],
  ): Promise<PackageStageWithItemsInput[]> {
    if (!stages || stages.length === 0) {
      return [];
    }

    const result: PackageStageWithItemsInput[] = [];
    for (const [index, stage] of stages.entries()) {
      result.push({
        stage: {
          name: stage.name,
          stageType: stage.stageType ?? MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: stage.weekFrom ?? null,
          weekTo: stage.weekTo ?? null,
          goal: stage.goal ?? null,
          sortOrder: stage.sortOrder ?? index + 1,
        },
        items: await this.buildPackageItems(packageFacilityId, stage.services),
      });
    }
    return result;
  }

  private async buildPackageItems(
    packageFacilityId: string,
    services?: MaternityPackageServiceInputDto[],
  ): Promise<Partial<PackageItem>[]> {
    if (!services || services.length === 0) {
      return [];
    }

    if (!this.facilityServicesService) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_INVALID);
    }

    const items: Partial<PackageItem>[] = [];
    const facilityServiceIds = new Set<string>();
    for (const [index, item] of services.entries()) {
      if (item.isOptional !== !item.isRequired) {
        throw new BadRequestException(MATERNITY_PACKAGE_CONSTANT.SERVICE_CLASSIFICATION_INVALID);
      }

      const facilityServiceId = await this.resolvePackageFacilityServiceId(packageFacilityId, item);

      if (facilityServiceIds.has(facilityServiceId)) {
        throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.PACKAGE_ITEM_DUPLICATED);
      }
      facilityServiceIds.add(facilityServiceId);

      items.push({
        facilityServiceId,
        includedQuantity: item.includedQuantity,
        isRequired: item.isRequired,
        isOptional: item.isOptional,
        allowedFacilityScope: PackageServiceFacilityScope.ALL,
        sortOrder: item.sortOrder ?? index + 1,
      });
    }

    return items;
  }

  private async resolvePackageFacilityServiceId(
    packageFacilityId: string,
    item: MaternityPackageServiceInputDto,
  ): Promise<string> {
    if (!this.facilityServicesService) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_INVALID);
    }

    if (item.serviceId) {
      const facilityService = await this.facilityServicesService.ensureAvailableForPackage(
        packageFacilityId,
        item.serviceId,
      );
      return facilityService.id;
    }

    if (!item.facilityServiceId) {
      throw new ConflictException(MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_INVALID);
    }

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
    return item.facilityServiceId;
  }
}
