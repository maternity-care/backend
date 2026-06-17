import { CreateRoleDto } from '../dto/request/create-role.dto';
import { UpdateRoleDto } from '../dto/request/update-role.dto';
import { Role } from '../entities/role.entity';

export const ROLES_SERVICE = Symbol('ROLES_SERVICE');

export interface IRolesService {
  create(dto: CreateRoleDto): Promise<Role>;
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role>;
  findByName(name: string): Promise<Role | null>;
  findByIds(ids: string[]): Promise<Role[]>;
  update(id: string, dto: UpdateRoleDto): Promise<Role>;
  remove(id: string): Promise<void>;
}
