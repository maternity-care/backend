import { DeepPartial } from 'typeorm';
import { Permission } from '../entities/permission.entity';

export const PERMISSIONS_REPOSITORY = Symbol('PERMISSIONS_REPOSITORY');

export interface IPermissionsRepository {
  create(data: DeepPartial<Permission>): Permission;
  save(permission: Permission): Promise<Permission>;
  findAll(): Promise<Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findByIds(ids: string[]): Promise<Permission[]>;
  remove(permission: Permission): Promise<void>;
}
