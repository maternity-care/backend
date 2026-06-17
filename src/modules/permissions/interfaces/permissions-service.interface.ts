import { CreatePermissionDto } from '../dto/request/create-permission.dto';
import { UpdatePermissionDto } from '../dto/request/update-permission.dto';
import { Permission } from '../entities/permission.entity';

export const PERMISSIONS_SERVICE = Symbol('PERMISSIONS_SERVICE');

export interface IPermissionsService {
  create(dto: CreatePermissionDto): Promise<Permission>;
  findAll(): Promise<Permission[]>;
  findById(id: string): Promise<Permission>;
  findByName(name: string): Promise<Permission | null>;
  findByIds(ids: string[]): Promise<Permission[]>;
  update(id: string, dto: UpdatePermissionDto): Promise<Permission>;
  remove(id: string): Promise<void>;
}
