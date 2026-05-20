import { DeepPartial } from 'typeorm';
import { Role } from '../entities/role.entity';

export const ROLES_REPOSITORY = Symbol('ROLES_REPOSITORY');

export interface IRolesRepository {
  create(data: DeepPartial<Role>): Role;
  save(role: Role): Promise<Role>;
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findByIds(ids: string[]): Promise<Role[]>;
  remove(role: Role): Promise<void>;
}
