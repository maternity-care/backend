import { PregnancyProfile } from './../../pregnancy-profile/entities/pregnancy-profile.entity';
import { Appointment } from './../../appointments/entities/appointment.entity';
import { RESPONSE_MESSAGES } from './../../../common/constants/response-message.constant';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AccountStatus, PregnancyProfileStatus } from '../../../common/constants/status.enum';
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
      order: { id: 'DESC' },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        pregnancyProfiles: true,
      },
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

  async updateStatus(id: string, status: AccountStatus, reason?: string): Promise<void> {
    await this.repository.update(id, { status: status, deletedReason: reason });
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    const user = await this.repository.findOne({ where: { phone } });
    return !!user;
  }

  async searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto> {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;

    const sort: 'ASC' | 'DESC' = query.sort?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const qb = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.pregnancyProfiles', 'pregnancyProfile');

    if (query.search) {
      qb.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.phone LIKE :search OR user.cccd LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

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

    if (query.cccd) {
      qb.andWhere('user.cccd LIKE :cccd', {
        cccd: `%${query.cccd}%`,
      });
    }

    if (query.status) {
      qb.andWhere('user.status = :status', {
        status: query.status,
      });
    }

    if (query.facilityId) {
      qb.andWhere((subQb) => {
        const appointmentExists = subQb
          .subQuery()
          .select('1')
          .from(Appointment, 'appointment')
          .where('appointment.patient_id = user.id')
          .andWhere('appointment.facility_id = :facilityId')
          .getQuery();

        return `EXISTS ${appointmentExists}`;
      });

      qb.setParameter('facilityId', query.facilityId);
    }

    qb.distinct(true)
      .orderBy('user.priorityLevel', sort)
      .addOrderBy('pregnancyProfile.createdAt', sort)
      .addOrderBy('pregnancyProfile.riskLevel', sort)
      .addOrderBy('user.id', 'DESC')
      .skip(offset)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      users,
      total,
    };
  }

  async findAllNoPregnant(query: SearchUserDto & { doctorId?: string }): Promise<User[]> {
    try {
      const keyword = query.search?.trim();
      const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
      const page = Math.max(Number(query.page) || 1, 1);
      const qb = this.repository
        .createQueryBuilder('user')
        .innerJoin(Appointment, 'appointment', 'appointment.patientId = user.id')
        .leftJoinAndSelect('user.pregnancyProfiles', 'pregnancyProfile')
        .where('1 = 1')
        .andWhere((qb) => {
          const activeProfileSubQuery = qb
            .subQuery()
            .select('1')
            .from(PregnancyProfile, 'activeProfile')
            .where('activeProfile.patientId = user.id')
            .andWhere('activeProfile.status = :activeStatus')
            .getQuery();

          return `NOT EXISTS (${activeProfileSubQuery})`;
        })
        .setParameter('activeStatus', PregnancyProfileStatus.ACTIVE)
        .distinct(true)
        .orderBy('user.id', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.doctorId) {
        qb.andWhere('appointment.doctorId = :doctorId', { doctorId: query.doctorId });
      }

      if (query.facilityId) {
        qb.andWhere('appointment.facilityId = :facilityId', { facilityId: query.facilityId });
      }

      if (keyword) {
        qb.andWhere(
          '(user.name LIKE :keyword OR user.email LIKE :keyword OR user.phone LIKE :keyword OR user.cccd LIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
      }

      return qb.getMany();
    } catch (error) {
      console.log('error', error);
      return [];
    }
  }

  async remove(user: User): Promise<void> {
    await this.repository.softRemove(user);
  }
}
