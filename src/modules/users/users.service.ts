import { UserAuth } from './../auth/entities/user-auth.entity';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IRedisCacheService, REDIS_CACHE_SERVICE } from '../../common/cache/redis-cache.interface';
import { CreateUserDto } from './dto/request/create-user.dto';
import { User } from './entities/user.entity';
import { IUsersRepository, USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { IUsersService } from './interfaces/users-service.interface';
import { UserStatusEnum } from './users.enum';
import { SearchUserDto } from './dto/request/search-user.dto';
import { SearchUserResponseDto } from './dto/response/search-user-response.dto';
import { AccountStatus } from '../../common/constants/status.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { getActiveFacilityId, isSuperAdmin } from '../../common/helpers/facility-scope.helper';
import { UserAuthRepository } from '../auth/repositories/user-auth.repository';
import { UpdatePregnantUserDto } from './dto/request/update-pregnant-user.dto';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class UsersService implements IUsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: UserAuthRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existingEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.');
    }

    const existingPhone = await this.usersRepository.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException(
        'Số điện thoại đã tồn tại trong hệ thống. Vui lòng sử dụng số đồ khác.',
      );
    }

    const existingCccd = await this.usersRepository.findByCccd(dto.cccd);
    if (existingCccd) {
      throw new ConflictException('Cccd đã tồn tại trong hệ thống. Vui lòng sử dụng cccd khác.');
    }

    const user = this.usersRepository.create({
      name: dto.name,
      cccd: dto?.cccd ? dto.cccd : undefined,
      email: dto.email,
      phone: dto?.phone ? dto.phone : undefined,
      dateOfBirth: dto?.dateOfBirth ? dto.dateOfBirth : undefined,
      address: dto?.address ? dto.address : undefined,
      province: dto?.province ? dto.province : undefined,
      ward: dto?.ward ? dto.ward : undefined,
      emergencyContactName: dto?.emergencyContactName ? dto.emergencyContactName : undefined,
      emergencyContactPhone: dto?.emergencyContactPhone ? dto.emergencyContactPhone : undefined,
      status: UserStatusEnum.ACTIVE,
    });

    const savedUser = await this.usersRepository.save(user);
    const userAuth = await this.userAuthRepository.create({
      userId: savedUser.id,
      email: dto.email,
      password: await bcrypt.hash(
        dto.password,
        this.configService.getOrThrow<number>('bcrypt.saltRounds'),
      ),
    });
    await this.userAuthRepository.save(userAuth);
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    const cacheKey = 'users:all';
    const cachedUsers = await this.cacheService.get<User[]>(cacheKey);

    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.usersRepository.findAll();
    await this.cacheService.set(cacheKey, users, 300);
    return users;
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  async findMyPregnancyProfiles(id: string) {
    return this.usersRepository.findMyPregnancyProfiles(id);
  }

  async update(id: string, dto: UpdatePregnantUserDto): Promise<User> {
    const user = await this.findById(id);

    user.name = dto.name ?? user.name;
    user.dateOfBirth = dto.dateOfBirth ?? user.dateOfBirth;
    user.address = dto.address ?? user.address;
    user.province = dto.province ?? user.province;
    user.avatar = dto.avatar ?? user.avatar;
    user.ward = dto.ward ?? user.ward;
    user.emergencyContactName = dto.emergencyContactName ?? user.emergencyContactName;
    user.emergencyContactPhone = dto.emergencyContactPhone ?? user.emergencyContactPhone;
    user.status = dto.status ?? user.status;
    if (dto.status && dto.status === UserStatusEnum.ACTIVE) {
      await this.userAuthRepository.updateStatus(user.id, AccountStatus.ACTIVE);
    }

    const savedUser = await this.usersRepository.save(user);
    await this.clearUsersCache(id);
    return this.findById(savedUser.id);
  }

  async updateProfile(id: string, dto: UpdatePregnantUserDto): Promise<User> {
    const user = await this.findById(id);

    user.name = dto.name ?? user.name;
    user.avatar = dto.avatar ?? user.avatar;
    user.dateOfBirth = dto.dateOfBirth ?? user.dateOfBirth;
    user.address = dto.address ?? user.address;
    user.province = dto.province ?? user.province;
    user.ward = dto.ward ?? user.ward;
    user.emergencyContactName = dto.emergencyContactName ?? user.emergencyContactName;
    user.emergencyContactPhone = dto.emergencyContactPhone ?? user.emergencyContactPhone;

    const savedUser = await this.usersRepository.save(user);
    await this.clearUsersCache(id);
    return savedUser;
  }

  async updateStatus(id: string, status: UserStatusEnum, reason?: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    if (status === UserStatusEnum.INACTIVE || status === UserStatusEnum.LOCKED) {
      if (!reason) {
        throw new BadRequestException('Vui lý nhập lý do khóa tài khoản.');
      }

      await this.usersRepository.updateStatus(id, status, reason);
      try {
        await this.userAuthRepository.updateStatus(user.id, status);
      } catch (error) {
        this.logger.warn(
          `Could not sync auth status for user ${user.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      await this.clearUsersCache(id);
      void this.jobsService
        .enqueueLockAccountEmail({
          to: user.email,
          name: user.name,
          reason: reason,
        })
        .catch((error) => {
          this.logger.warn(
            `Could not enqueue lock account email for user ${user.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      return;
    }

    await this.usersRepository.updateStatus(id, status);
    return;
  }

  private async clearUsersCache(userId?: string): Promise<void> {
    await this.cacheService.del('users:all');

    if (userId) {
      await this.cacheService.del(`users:${userId}`);
    }
  }

  async searchUsers(
    query: SearchUserDto,
    actor?: AuthenticatedUser,
  ): Promise<SearchUserResponseDto> {
    if (actor && !isSuperAdmin(actor)) {
      return this.usersRepository.searchUsers({
        ...query,
        facilityId: getActiveFacilityId(actor) ?? undefined,
      });
    }
    return this.usersRepository.searchUsers(query);
  }

  async findAllNoPregnant(): Promise<User[]> {
    return this.usersRepository.findAllNoPregnant();
  }
}
