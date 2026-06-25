import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { IPermissionsRepository } from '../interfaces/permissions-repository.interface';

@Injectable()
export class PermissionsRepository implements IPermissionsRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repository: Repository<Permission>,
  ) {}

  create(data: DeepPartial<Permission>): Permission {
    return this.repository.create(data);
  }

  save(permission: Permission): Promise<Permission> {
    return this.repository.save(permission);
  }

  findAll(): Promise<Permission[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  findById(id: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { name } });
  }

  findByIds(ids: string[]): Promise<Permission[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.repository.find({ where: { id: In(ids) } });
  }

  async remove(permission: Permission): Promise<void> {
    await this.repository.softRemove(permission);
  }
}
