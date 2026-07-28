import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ActiveStatus,
  FacilityStatus,
} from '../../common/constants/status.enum';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { FacilitiesService } from '../facilities/facilities.service';
import { FacilityService } from '../facility-services/entities/facility-service.entity';
import { ServiceTypesService } from '../service-types/service-types.service';
import {
  CreateServiceDto,
  CreateServiceFacilityAssignmentDto,
  ServiceSaleMode,
} from './dto/requests/create-service.dto';
import { SearchServiceDto } from './dto/requests/search-service.dto';
import { UpdateServiceDto } from './dto/requests/update-service.dto';
import { Service } from './entities/service.entity';
import {
  IServicesRepository,
  SERVICES_REPOSITORY,
} from './interfaces/services-repository.interface';

@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICES_REPOSITORY)
    private readonly repository: IServicesRepository,
    private readonly serviceTypesService: ServiceTypesService,
    @Optional()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly facilitiesService?: FacilitiesService,
  ) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    await this.ensureUniqueCode(dto.code);
    await this.ensureUniqueName(dto.name);
    await this.serviceTypesService.findActiveById(dto.serviceTypeId);

    const serviceData = {
      ...dto,
      facilityAssignments: undefined,
      saleMode: dto.saleMode ?? ServiceSaleMode.BOTH,
      description: dto.description ?? '',
      requiresDoctorWarning: dto.requiresDoctorWarning ? true : false,
    };

    if (!dto.facilityAssignments || dto.facilityAssignments.length === 0) {
      const entity = this.repository.create(serviceData);
      return this.repository.save(entity);
    }

    const assignments = await this.validateFacilityAssignments(dto.facilityAssignments);

    if (!this.dataSource) {
      throw new ConflictException('Không thể gán service vào cơ sở vì DataSource chưa được cấu hình');
    }

    return this.dataSource.transaction(async (manager) => {
      const service = manager.create(Service, serviceData);
      const savedService = await manager.save(Service, service);

      const facilityServices = assignments.map((assignment) =>
        manager.create(FacilityService, {
          facilityId: assignment.facilityId,
          serviceId: savedService.id,
          price: assignment.price ?? savedService.basePrice,
          durationMinutes: assignment.durationMinutes ?? savedService.defaultDurationMinutes,
          status: assignment.status ?? ActiveStatus.ACTIVE,
        }),
      );

      savedService.facilityServices = await manager.save(FacilityService, facilityServices);
      return savedService;
    });
  }

  private async validateFacilityAssignments(
    assignments: CreateServiceFacilityAssignmentDto[],
  ): Promise<CreateServiceFacilityAssignmentDto[]> {
    if (!this.facilitiesService) {
      throw new ConflictException('Không thể gán service vào cơ sở vì FacilitiesService chưa được cấu hình');
    }

    for (const assignment of assignments) {
      const facility = await this.facilitiesService.findById(assignment.facilityId);
      if (facility.status !== FacilityStatus.ACTIVE) {
        throw new ConflictException(`Cơ sở ${assignment.facilityId} đang ngừng hoạt động`);
      }
    }

    return assignments;
  }

  findAll(filters?: SearchServiceDto): Promise<Service[]> {
    return this.repository.findAll(filters);
  }

  findAllPaginated(filters?: SearchServiceDto) {
    return this.repository.findAllPaginated(filters);
  }

  async findById(id: string): Promise<Service> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException(SERVICE_CONSTANT.NOT_FOUND);
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findById(id);

    if (dto.code && dto.code !== service.code) {
      await this.ensureUniqueCode(dto.code);
    }
    if (dto.name && dto.name !== service.name) {
      await this.ensureUniqueName(dto.name);
    }
    if (dto.serviceTypeId && dto.serviceTypeId !== service.serviceTypeId) {
      await this.serviceTypesService.findActiveById(dto.serviceTypeId);
    }

    Object.assign(service, {
      ...dto,
      description: dto.description ?? service.description,
      ...(dto.requiresDoctorWarning === undefined
        ? {}
        : { requiresDoctorWarning: dto.requiresDoctorWarning ? 1 : 0 }),
    });
    return this.repository.save(service);
  }

  async remove(id: string): Promise<SafeRemoveResult> {
    const service = await this.findById(id);
    const dependencyCount = await this.repository.countDependencies(service.id);

    if (dependencyCount === 0) {
      await this.repository.remove(service);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.repository.updateStatus(service, ActiveStatus.INACTIVE);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  private async ensureUniqueCode(code: string): Promise<void> {
    if (await this.repository.findByCode(code)) {
      throw new ConflictException(SERVICE_CONSTANT.CODE_EXISTS);
    }
  }

  private async ensureUniqueName(name: string): Promise<void> {
    if (await this.repository.findByName(name)) {
      throw new ConflictException(SERVICE_CONSTANT.NAME_EXISTS);
    }
  }
}
