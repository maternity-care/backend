import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUsersRepository } from '../interfaces/users-repository.interface';

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

  async remove(user: User): Promise<void> {
    await this.repository.softRemove(user);
  }
}
