import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActiveStatus,
  AvailabilityStatus,
  FacilityStatus,
} from '../../common/constants/status.enum';
import { FACILITY_SERVICE_CONSTANT } from '../../common/constants/facility-service.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { ServicesService } from '../services/services.service';
import { FacilityService } from './entities/facility-services.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import { CreateFacilityServiceDto } from './dto/requests/create-facility-service.dto';
import { SearchFacilityServiceDto } from './dto/requests/search-facility-service.dto';
import { UpdateFacilityServiceDto } from './dto/requests/update-facility-service.dto';
import {
  FACILITY_SERVICES_REPOSITORY,
  FacilityServiceWithDetails,
  IFacilityServicesRepository,
} from './interfaces/facility-services-repository.interface';

@Injectable()
export class FacilityServicesService {
  constructor(
    @Inject(FACILITY_SERVICES_REPOSITORY)
    private readonly repository: IFacilityServicesRepository,
    private readonly facilitiesService: FacilitiesService,
    private readonly servicesService: ServicesService,
  ) {}

  // Gán một service gốc cho một facility, đồng thời set giá/thời lượng thực tế tại facility đó.
  async create(dto: CreateFacilityServiceDto): Promise<FacilityService> {
    await this.validateFacilityAndService(dto.facilityId, dto.serviceId);

    if (await this.repository.findByFacilityAndService(dto.facilityId, dto.serviceId)) {
      throw new ConflictException(FACILITY_SERVICE_CONSTANT.ALREADY_EXISTS);
    }

    return this.repository.save(this.repository.create(dto));
  }

  // Lấy danh sách mapping facility-service cho màn hình quản trị.
  findAll(filters?: SearchFacilityServiceDto): Promise<FacilityServiceWithDetails[]> {
    return this.repository.findAll(filters);
  }

  // Lấy danh sách mapping có phân trang.
  findAllPaginated(filters?: SearchFacilityServiceDto) {
    return this.repository.findAllPaginated(filters);
  }

  // Lấy danh sách dịch vụ public của một facility; chỉ trả các dịch vụ đang available/active.
  async findPublicByFacilityId(facilityId: string, filters?: SearchFacilityServiceDto) {
    const facility = await this.facilitiesService.findById(facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new ConflictException(FACILITY_SERVICE_CONSTANT.FACILITY_INACTIVE);
    }
    return this.repository.findPublicByFacilityId(facilityId, filters);
  }

  // Tìm một mapping theo id, dùng cho detail/update/delete.
  async findById(id: string): Promise<FacilityService> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(FACILITY_SERVICE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  // Detail cho controller/FE: ngoài id còn có facilityName/serviceName để hiển thị trực tiếp.
  async findDetailsById(id: string): Promise<FacilityServiceWithDetails> {
    const entity = await this.repository.findDetailsById(id);
    if (!entity) {
      throw new NotFoundException(FACILITY_SERVICE_CONSTANT.NOT_FOUND);
    }
    return entity;
  }

  // Cập nhật giá/thời lượng/trạng thái hoặc chuyển sang facility/service khác nếu cần.
  async update(id: string, dto: UpdateFacilityServiceDto): Promise<FacilityService> {
    const entity = await this.findById(id);
    const nextFacilityId = dto.facilityId ?? entity.facilityId;
    const nextServiceId = dto.serviceId ?? entity.serviceId;

    if (dto.facilityId || dto.serviceId) {
      await this.validateFacilityAndService(nextFacilityId, nextServiceId);
      const duplicated = await this.repository.findByFacilityAndService(nextFacilityId, nextServiceId);
      if (duplicated && duplicated.id !== entity.id) {
        throw new ConflictException(FACILITY_SERVICE_CONSTANT.ALREADY_EXISTS);
      }
    }

    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  // Xóa an toàn: chưa có lịch sử thì hard delete, đã có appointment/extra-service thì chuyển unavailable.
  async remove(id: string): Promise<SafeRemoveResult> {
    const entity = await this.findById(id);
    const dependencyCount = await this.repository.countDependencies(entity.facilityId, entity.serviceId);

    if (dependencyCount === 0) {
      await this.repository.remove(entity);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.repository.updateStatus(entity, AvailabilityStatus.UNAVAILABLE);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  // Validation chung: facility phải active và service gốc phải active trước khi public/cung cấp tại cơ sở.
  private async validateFacilityAndService(facilityId: string, serviceId: string): Promise<void> {
    const [facility, service] = await Promise.all([
      this.facilitiesService.findById(facilityId),
      this.servicesService.findById(serviceId),
    ]);

    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new ConflictException(FACILITY_SERVICE_CONSTANT.FACILITY_INACTIVE);
    }
    if (service.status !== ActiveStatus.ACTIVE) {
      throw new ConflictException(FACILITY_SERVICE_CONSTANT.SERVICE_INACTIVE);
    }
  }
}
