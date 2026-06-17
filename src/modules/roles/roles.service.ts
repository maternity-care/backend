import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { UpdateRoleDto } from './dto/request/update-role.dto';
import { Role } from './entities/role.entity';
import { IRolesRepository, ROLES_REPOSITORY } from './interfaces/roles-repository.interface';
import { IRolesService } from './interfaces/roles-service.interface';
import {
  IPermissionsService,
  PERMISSIONS_SERVICE,
} from '../permissions/interfaces/permissions-service.interface';

@Injectable()
export class RolesService implements IRolesService {
  constructor(
    @Inject(ROLES_REPOSITORY)
    private readonly rolesRepository: IRolesRepository,
    @Inject(PERMISSIONS_SERVICE)
    private readonly permissionsService: IPermissionsService,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.rolesRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Role name already exists');
    }

    const role = this.rolesRepository.create({
      name: dto.name,
      guardName: dto.guardName ?? 'api',
      permissions: dto.permissionIds
        ? await this.permissionsService.findByIds(dto.permissionIds)
        : [],
    });

    return this.rolesRepository.save(role);
  }

  findAll(): Promise<Role[]> {
    return this.rolesRepository.findAll();
  }

  async findById(id: string): Promise<Role> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findByName(name);
  }

  findByIds(ids: string[]): Promise<Role[]> {
    return this.rolesRepository.findByIds(ids);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);

    if (dto.name && dto.name !== role.name) {
      const existing = await this.rolesRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Role name already exists');
      }
    }

    if (dto.permissionIds) {
      role.permissions = await this.permissionsService.findByIds(dto.permissionIds);
    }

    role.name = dto.name ?? role.name;
    role.guardName = dto.guardName ?? role.guardName;
    return this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findById(id);
    await this.rolesRepository.remove(role);
  }
}
