import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUsersRepository } from '../interfaces/users-repository.interface';
import { SearchUserDto } from '../dto/request/search-user.dto';
import { SearchUserResponseDto } from '../dto/response/search-user-response.dto';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  create(data: DeepPartial<User>): User {
    return this.repository.create(data);
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.repository.find({
      relations: { roles: { permissions: true }, permissionOverrides: { permission: true } },
      order: { id: 'ASC' },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: { roles: { permissions: true }, permissionOverrides: { permission: true } },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: { roles: { permissions: true }, permissionOverrides: { permission: true } },
    });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.permissionOverrides', 'permissionOverride')
      .leftJoinAndSelect('permissionOverride.permission', 'overridePermission')
      .where('user.email = :email', { email })
      .getOne();
  }

  async updateStatus(id: string, status: number): Promise<void> {
    await this.repository.update(id, { status });
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    const user = await this.repository.findOne({ where: { phone } });
    return !!user;
  }

  async searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto> {
    const offset = Number(((Number(query?.page) || 1) - 1) * (query?.limit || 10)) || 0;
    const limit = Number(query.limit) || 10;
    const qb = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.permissionOverrides', 'permissionOverride')
      .leftJoinAndSelect('permissionOverride.permission', 'overridePermission');

    if (query.name) {
      qb.andWhere('user.name LIKE :name', {
        name: `%${query.name}%`,
      });
    }

    if (query.email) {
      qb.andWhere('user.email LIKE :email', {
        email: `%${query.email}%`,
      });
    }

    if (query.phone) {
      qb.andWhere('user.phone LIKE :phone', {
        phone: `%${query.phone}%`,
      });
    }

    if (query.status !== undefined) {
      qb.andWhere('user.status = :status', {
        status: query.status,
      });
    }

    if (query.roleId) {
      qb.andWhere('role.id = :roleId', {
        roleId: query.roleId,
      });
    }

    if (query.sort && query.sort === 'DESC') {
      qb.orderBy(`user.id`, 'DESC');
    }

    const [users, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      users,
      total,
    };
  }

  async remove(user: User): Promise<void> {
    await this.repository.softRemove(user);
  }
}
