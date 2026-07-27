import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActiveStatus } from '../../common/constants/status.enum';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { CreateServiceTypeDto } from './dto/requests/create-service-type.dto';
import { SearchServiceTypesDto } from './dto/requests/search-service-types.dto';
import { UpdateServiceTypeDto } from './dto/requests/update-service-type.dto';
import { ServiceType } from './entities/service-type.entity';
import {
  IServiceTypesRepository,
  SERVICE_TYPES_REPOSITORY,
} from './interfaces/service-types-repository.interface';

@Injectable()
export class ServiceTypesService {
  constructor(
    @Inject(SERVICE_TYPES_REPOSITORY)
    private readonly repository: IServiceTypesRepository,
  ) {}

  async create(dto: CreateServiceTypeDto): Promise<ServiceType> {
    await this.ensureUniqueName(dto.name);
    const code = await this.generateCode(dto.name);
    const serviceType = this.repository.create({
      ...dto,
      code,
      description: dto.description ?? null,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
    return this.repository.save(serviceType);
  }

  async findAll(filters?: SearchServiceTypesDto): Promise<ServiceType[]> {
    const serviceTypes = await this.repository.findAll(filters);
    this.ensureRowsFound(serviceTypes);
    return serviceTypes;
  }

  async findAllPaginated(filters?: SearchServiceTypesDto) {
    const result = await this.repository.findAllPaginated(filters);
    this.ensureRowsFound(result.items);
    return result;
  }

  async findById(id: string): Promise<ServiceType> {
    const serviceType = await this.repository.findById(id);
    if (!serviceType) {
      throw new NotFoundException(SERVICE_CONSTANT.TYPE_NOT_FOUND);
    }
    return serviceType;
  }

  async findActiveById(id: string): Promise<ServiceType> {
    const serviceType = await this.repository.findById(id);
    if (!serviceType || serviceType.status !== ActiveStatus.ACTIVE) {
      throw new NotFoundException(SERVICE_CONSTANT.TYPE_ACTIVE_NOT_FOUND);
    }
    return serviceType;
  }

  async update(id: string, dto: UpdateServiceTypeDto): Promise<ServiceType> {
    const serviceType = await this.findById(id);
    if (dto.name && dto.name !== serviceType.name) {
      await this.ensureUniqueName(dto.name, serviceType.id);
    }

    Object.assign(serviceType, {
      ...dto,
      description: dto.description ?? serviceType.description,
    });
    return this.repository.save(serviceType);
  }

  async remove(id: string): Promise<SafeRemoveResult> {
    const serviceType = await this.findById(id);
    const dependencyCount = await this.repository.countDependencies(serviceType.id);
    if (dependencyCount === 0) {
      await this.repository.remove(serviceType);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    serviceType.status = ActiveStatus.INACTIVE;
    serviceType.deletedAt = new Date();
    await this.repository.save(serviceType);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  private ensureRowsFound(rows?: unknown[] | null): void {
    if (!rows || rows.length === 0) {
      throw new NotFoundException(SERVICE_CONSTANT.TYPE_NOT_FOUND);
    }
  }

  private async ensureUniqueName(name: string, excludeId?: string): Promise<void> {
    if (await this.repository.findByName(name, excludeId)) {
      throw new ConflictException(SERVICE_CONSTANT.TYPE_NAME_EXISTS);
    }
  }

  private async generateCode(name: string): Promise<string> {
    const prefix = this.buildCodePrefixFromName(name);
    const existingCodes = await this.repository.findCodesByPrefix(prefix);
    const nextSequence = this.getNextSequence(existingCodes, prefix);

    return nextSequence === 1 && !existingCodes.includes(prefix)
      ? prefix
      : `${prefix}_${String(nextSequence).padStart(2, '0')}`;
  }

  private buildCodePrefixFromName(name: string): string {
    const normalized = String(name)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    return normalized ? normalized.split(' ').join('_').slice(0, 40) : 'SERVICE_TYPE';
  }

  private getNextSequence(existingCodes: string[], prefix: string): number {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}_(\\d+)$`);
    const maxSequence = existingCodes.reduce((max, code) => {
      if (code === prefix) return Math.max(max, 1);
      const match = code.match(pattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return maxSequence + 1;
  }
}
