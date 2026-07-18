import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { FacilityStatus, MaternityPackageStatus } from '../../common/constants/status.enum';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { MaternityPackage } from './entities/maternity-packages.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import { CreateMaternityPackageDto } from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { UpdateMaternityPackageDto } from './dto/requests/update-maternity-package.dto';
import { AvailableMaternityPackageResponseDto } from './dto/responses/available-maternity-package-response.dto';
import {
  IMaternityPackagesRepository,
  MATERNITY_PACKAGES_REPOSITORY,
} from './interfaces/maternity-packages-repository.interface';

@Injectable()
export class MaternityPackagesService {
  constructor(
    // Inject qua token để service phụ thuộc vào abstraction, không phụ thuộc trực tiếp TypeORM class.
    @Inject(MATERNITY_PACKAGES_REPOSITORY)
    private readonly repository: IMaternityPackagesRepository,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  // Tạo "vỏ gói" dịch vụ: code/name/price/duration/status.
  // Các dịch vụ con của gói sẽ được gắn sau bằng module package-services.
  async create(dto: CreateMaternityPackageDto): Promise<MaternityPackage> {
    await this.ensureUniqueCode(dto.code);
    await this.ensureUniqueName(dto.name);

    const entity = this.repository.create({
      ...dto,
      description: dto.description ?? undefined,
      priorityLevel: dto.priorityLevel ?? 0,
    });
    return this.repository.save(entity);
  }

  // Lấy danh sách gói cho management/public tùy controller gọi filter status thế nào.
  async findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackage[]> {
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
  ): Promise<AvailableMaternityPackageResponseDto[]> {
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

  // Cập nhật thông tin gói; nếu đổi code/name thì kiểm tra trùng lại.
  async update(id: string, dto: UpdateMaternityPackageDto): Promise<MaternityPackage> {
    const entity = await this.findById(id);

    if (dto.code && dto.code !== entity.code) {
      await this.ensureUniqueCode(dto.code);
    }
    if (dto.name && dto.name !== entity.name) {
      await this.ensureUniqueName(dto.name);
    }

    Object.assign(entity, {
      ...dto,
      description: dto.description ?? entity.description,
    });
    return this.repository.save(entity);
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
}
