import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';
import {
  IPermissionsRepository,
  PERMISSIONS_REPOSITORY,
} from './interfaces/permissions-repository.interface';
import { IPermissionsService } from './interfaces/permissions-service.interface';

@Injectable()
export class PermissionsService implements IPermissionsService {
  constructor(
    @Inject(PERMISSIONS_REPOSITORY)
    private readonly permissionsRepository: IPermissionsRepository,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Permission name already exists');
    }

    const permission = this.permissionsRepository.create({
      name: dto.name,
      guardName: dto.guardName ?? 'api',
    });

    return this.permissionsRepository.save(permission);
  }

  findAll(): Promise<Permission[]> {
    return this.permissionsRepository.findAll();
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  findByName(name: string): Promise<Permission | null> {
    return this.permissionsRepository.findByName(name);
  }

  findByIds(ids: string[]): Promise<Permission[]> {
    return this.permissionsRepository.findByIds(ids);
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findById(id);

    if (dto.name && dto.name !== permission.name) {
      const existing = await this.permissionsRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Permission name already exists');
      }
    }

    Object.assign(permission, dto);
    return this.permissionsRepository.save(permission);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findById(id);
    await this.permissionsRepository.remove(permission);
  }
}
