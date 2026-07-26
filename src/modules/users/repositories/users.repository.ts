import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AccountStatus } from '../../../common/constants/status.enum';
import { IUsersRepository } from '../interfaces/users-repository.interface';
import { SearchUserDto } from '../dto/request/search-user.dto';
import { SearchUserResponseDto } from '../dto/response/search-user-response.dto';
import { parseSearch, searchBuilder } from '../../../common/helpers/search-builder';

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
      order: { id: 'ASC' },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getOne();
  }

  async updateStatus(id: string, status: AccountStatus): Promise<void> {
    await this.repository.update(id, { status });
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    const user = await this.repository.findOne({ where: { phone } });
    return !!user;
  }

  async searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto> {
    const offset = Number(((Number(query?.page) || 1) - 1) * (query?.limit || 10)) || 0;
    const limit = Number(query.limit) || 10;
    const qb = this.repository.createQueryBuilder('user');

    const keyword = parseSearch(query.search).find((filter) => filter.field === 'keyword')
      ?.values[0];
    if (keyword) {
      qb.andWhere(
        '(user.name LIKE :keyword OR user.email LIKE :keyword OR user.phone LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    searchBuilder(qb, query.search, {
      columns: ['name', 'email', 'phone', 'status'],
    });

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
