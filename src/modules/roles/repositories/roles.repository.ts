import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DeepPartial } from 'typeorm';
import { Role } from '../entities/role.entity';
import { IRolesRepository } from '../interfaces/roles-repository.interface';

@Injectable()
export class RolesRepository implements IRolesRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repository: Repository<Role>,
  ) {}

  create(data: DeepPartial<Role>): Role {
    return this.repository.create(data);
  }

  save(role: Role): Promise<Role> {
    return this.repository.save(role);
  }

  findAll(): Promise<Role[]> {
    return this.repository.find({
      relations: { permissions: true },
      order: { id: 'ASC' },
    });
  }

  findById(id: string): Promise<Role | null> {
    return this.repository.findOne({
      where: { id },
      relations: { permissions: true },
    });
  }

  findByName(name: string): Promise<Role | null> {
    return this.repository.findOne({
      where: { name },
      relations: { permissions: true },
    });
  }

  findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.repository.find({
      where: { id: In(ids) },
      relations: { permissions: true },
    });
  }

  async remove(role: Role): Promise<void> {
    await this.repository.remove(role);
  }
}
