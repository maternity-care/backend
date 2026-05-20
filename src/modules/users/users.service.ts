import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IRedisCacheService, REDIS_CACHE_SERVICE } from '../../common/cache/redis-cache.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { IUsersRepository, USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { IUsersService } from './interfaces/users-service.interface';
import { IRolesService, ROLES_SERVICE } from '../roles/interfaces/roles-service.interface';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(ROLES_SERVICE)
    private readonly rolesService: IRolesService,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: await bcrypt.hash(dto.password, saltRounds),
      roles: dto.roleIds ? await this.rolesService.findByIds(dto.roleIds) : [],
    });

    const savedUser = await this.usersRepository.save(user);
    await this.clearUsersCache();
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
    const cacheKey = `users:${id}`;
    const cachedUser = await this.cacheService.get<User>(cacheKey);

    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheService.set(cacheKey, user, 300);
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    if (dto.password) {
      const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
      user.password = await bcrypt.hash(dto.password, saltRounds);
    }

    if (dto.roleIds) {
      user.roles = await this.rolesService.findByIds(dto.roleIds);
    }

    user.name = dto.name ?? user.name;
    user.email = dto.email ?? user.email;
    user.status = dto.status ?? user.status;

    const savedUser = await this.usersRepository.save(user);
    await this.clearUsersCache(id);
    return savedUser;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.password) {
      const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
      user.password = await bcrypt.hash(dto.password, saltRounds);
    }

    user.name = dto.name ?? user.name;

    const savedUser = await this.usersRepository.save(user);
    await this.clearUsersCache(id);
    return savedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
    await this.clearUsersCache(id);
  }

  private async clearUsersCache(userId?: string): Promise<void> {
    await this.cacheService.del('users:all');

    if (userId) {
      await this.cacheService.del(`users:${userId}`);
    }
  }
}
