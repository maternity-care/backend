import { Appointment } from './../../appointments/entities/appointment.entity';
import { RESPONSE_MESSAGES } from './../../../common/constants/response-message.constant';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Like, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AccountStatus } from '../../../common/constants/status.enum';
import { IUsersRepository } from '../interfaces/users-repository.interface';
import { SearchUserDto } from '../dto/request/search-user.dto';
import { SearchUserResponseDto } from '../dto/response/search-user-response.dto';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
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

  findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOne({ where: { phone } });
  }

  findByCccd(cccd: string): Promise<User | null> {
    return this.repository.findOne({ where: { cccd } });
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

  async findMyPregnancyProfiles(id: string): Promise<User> {
    const user = await this.repository.findOne({
      where: { id },
      relations: {
        pregnancyProfiles: true,
      },
    });
    if (!user) {
      throw new NotFoundException(RESPONSE_MESSAGES.NOT_FOUND_CURRENT_USER);
    }
    return user;
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

    const where: FindOptionsWhere<User> = {};

    if (query?.name) {
      where.name = Like(`%${query.name}%`);
    }

    if (query?.email) {
      where.email = Like(`%${query.email}%`);
    }

    if (query?.phone) {
      where.phone = Like(`%${query.phone}%`);
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.cccd) {
      where.cccd = Like(`%${query.cccd}%`);
    }

    if (query?.sort && query.sort.toLocaleLowerCase() === 'asc') {
      query.sort = 'ASC';
    } else {
      query.sort = 'DESC';
    }

    if (query?.facilityId) {
      const data = await this.appointmentRepository.findAndCount({
        select: [],
        relations: {
          patient: true,
        },
        where: {
          facilityId: query.facilityId,
          patient: {
            ...where,
          },
        },
        order: {
          patient: {
            priorityLevel: query.sort,
            pregnancyProfiles: { createdAt: query.sort, riskLevel: query.sort },
          },
        },
        skip: offset,
        take: limit,
      });

      const [appointments, total] = data;
      return {
        users: appointments.map((appointment) => appointment.patient),
        total,
      };
    }

    const data = this.repository.findAndCount({
      relations: { pregnancyProfiles: true },
      where,
      order: {
        priorityLevel: query.sort,
        pregnancyProfiles: { createdAt: query.sort, riskLevel: query.sort },
      },
      skip: offset,
      take: limit,
    });

    const [users, total] = await data;
    return {
      users,
      total,
    };
  }

  async remove(user: User): Promise<void> {
    await this.repository.softRemove(user);
  }
}
