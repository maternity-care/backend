import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActiveStatus } from '../../common/constants/status.enum';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { ServiceTypesService } from '../service-types/service-types.service';
import { CreateServiceDto, ServiceSaleMode } from './dto/requests/create-service.dto';
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
  ) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    await this.ensureUniqueCode(dto.code);
    await this.ensureUniqueName(dto.name);
    await this.serviceTypesService.findActiveById(dto.serviceTypeId);

    const service = this.repository.create({
      ...dto,
      saleMode: dto.saleMode ?? ServiceSaleMode.BOTH,
      description: dto.description ?? '',
      requiresDoctorWarning: dto.requiresDoctorWarning ? true : false,
    });
    return this.repository.save(service);
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
