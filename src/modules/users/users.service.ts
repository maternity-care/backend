import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { IRedisCacheService, REDIS_CACHE_SERVICE } from '../../common/cache/redis-cache.interface';
import {
  PERMISSIONS_SERVICE,
  IPermissionsService,
} from '../permissions/interfaces/permissions-service.interface';
import { UserPermission } from '../permissions/entities/user-permission.entity';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserPermissionOverrideDto } from './dto/request/user-permission-override.dto';
import { User } from './entities/user.entity';
import { IUsersRepository, USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { IUsersService } from './interfaces/users-service.interface';
import { IRolesService, ROLES_SERVICE } from '../roles/interfaces/roles-service.interface';
import { UserStatusEnum } from './users.enum';
import { IAdminManageService } from './interfaces/admin-manage-service.interface';
import { RoleEnum } from '../../common/constants/role.enum';
import {
  IStaffProfileRepository,
  STAFF_PROFILE_REPOSITORY,
} from '../staffs/interfaces/staff-profile-repository.interface';
import { AdminCreateUserDto } from './dto/request/admin-create-user.dto';
import { SearchUserDto } from './dto/request/search-user.dto';
import { SearchUserResponseDto } from './dto/response/search-user-response.dto';
import { IMailService, MAIL_SERVICE } from '../mail/interfaces/mail-service.interface';

@Injectable()
export class UsersService implements IUsersService, IAdminManageService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(ROLES_SERVICE)
    private readonly rolesService: IRolesService,
    @Inject(PERMISSIONS_SERVICE)
    private readonly permissionsService: IPermissionsService,
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cacheService: IRedisCacheService,
    @InjectRepository(UserPermission)
    private readonly userPermissionsRepository: Repository<UserPermission>,
    private readonly configService: ConfigService,
    @Inject(STAFF_PROFILE_REPOSITORY)
    private readonly staffProfileRepository: IStaffProfileRepository,
    @Inject(MAIL_SERVICE)
    private readonly mailService: IMailService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.');
    }

    const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto?.phone ? dto.phone : undefined,
      password: await bcrypt.hash(dto.password, saltRounds),
      roles: dto.roleIds ? await this.rolesService.findByIds(dto.roleIds) : [],
    });

    const savedUser = await this.usersRepository.save(user);
    await this.syncPermissionOverrides(savedUser.id, dto.permissionOverrides);
    await this.clearUsersCache();
    return this.findById(savedUser.id);
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
    user.phone = dto.phone ?? user.phone;
    user.status = dto.status ?? user.status;

    const savedUser = await this.usersRepository.save(user);
    await this.syncPermissionOverrides(savedUser.id, dto.permissionOverrides);
    await this.clearUsersCache(id);
    return this.findById(savedUser.id);
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

  async updateStatus(id: string, status: UserStatusEnum): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    await this.usersRepository.updateStatus(id, status);
    await this.clearUsersCache(id);
  }

  private async clearUsersCache(userId?: string): Promise<void> {
    await this.cacheService.del('users:all');

    if (userId) {
      await this.cacheService.del(`users:${userId}`);
    }
  }

  private async syncPermissionOverrides(
    userId: string,
    overrides?: UserPermissionOverrideDto[],
  ): Promise<void> {
    if (overrides === undefined) {
      return;
    }

    const uniqueOverrides = Array.from(
      new Map(overrides.map((override) => [override.permissionId, override])).values(),
    );
    const permissions = await this.permissionsService.findByIds(
      uniqueOverrides.map((override) => override.permissionId),
    );

    if (permissions.length !== uniqueOverrides.length) {
      throw new NotFoundException('One or more permissions were not found');
    }

    await this.userPermissionsRepository.delete({ userId });

    if (uniqueOverrides.length === 0) {
      return;
    }

    await this.userPermissionsRepository.save(
      uniqueOverrides.map((override) =>
        this.userPermissionsRepository.create({
          userId,
          permissionId: override.permissionId,
          effect: override.effect,
        }),
      ),
    );
  }

  async findAllUsers(query: SearchUserDto): Promise<SearchUserResponseDto> {
    return this.searchUsers(query);
  }

  async findUserById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.findByEmail(email);
  }

  async createUser(dto: AdminCreateUserDto): Promise<User> {
    // check personal email của nhân viên đã tồn tại trong hệ thống chưa
    const isPersonalEmailExists = await this.staffProfileRepository.checkPersonalEmailExists(
      dto.personalEmail,
    );
    if (isPersonalEmailExists) {
      throw new ConflictException(
        'Email cá nhân đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.',
      );
    }

    // check phone của nhân viên đã tồn tại trong hệ thống chưa
    const isPhoneExists = await this.usersRepository.checkPhoneExists(dto.phone);
    if (isPhoneExists) {
      throw new ConflictException(
        'Số điện thoại đã tồn tại trong hệ thống. Vui lòng sử dụng số điện thoại khác.',
      );
    }

    // hệ thống tạo email công ty và mật khẩu ngẫu nhiên cho nhân viên
    const email = await this.staffProfileRepository.generateStaffEmailFromName(dto.name);
    const password = this.staffProfileRepository.generateStaffPassword();

    // tạo mã nhân viên = prefix + năm hiện tại + số thứ tự tăng dần (4 chữ số)
    const employeeCode = await this.staffProfileRepository.generateStaffEmployeeCode();

    if (!dto.roleIds || dto.roleIds.length === 0) {
      const defaultRole = await this.rolesService.findByName(RoleEnum.STAFF);
      if (!defaultRole) {
        throw new NotFoundException('Không tìm thấy role mặc định cho nhân viên.');
      }
      // nếu không có roleIds thì mặc định là role STAFF
      dto.roleIds = [defaultRole.id];

      // nếu không có permissionOverrides thì mặc định là permission của role STAFF
      if (!dto.permissionOverrides) {
        dto.permissionOverrides = defaultRole.permissions.map((permission) => ({
          permissionId: permission.id,
          effect: 'allow',
        }));
      }
    }

    // tạo người dùng trong hệ thống
    const userDto: CreateUserDto = {
      ...dto,
      email,
      password,
      permissionOverrides: dto.permissionOverrides,
    };

    const newUser = await this.create(userDto);

    // tạo mã nhân viên cho nhân viên, mặc định là staff
    let prefixEmployeeCode = 'ST'; // Mặc định là nhân viên
    // sau đó tùy vào các role để tạo prefix cho mã nhân viên
    if (newUser.roles && newUser.roles.length > 0) {
      if (newUser.roles.some((role) => role.name === RoleEnum.ADMIN)) {
        prefixEmployeeCode = 'AD';
      } else if (newUser.roles.some((role) => role.name === RoleEnum.DOCTOR)) {
        prefixEmployeeCode = 'DR';
      } else if (newUser.roles.some((role) => role.name === RoleEnum.NURSE)) {
        prefixEmployeeCode = 'NU';
      }
    }

    const staffProfileData = {
      userId: newUser.id,
      name: dto.name,
      personalEmail: dto.personalEmail,
      position: dto?.position ? dto.position : 'Employee',
      employeeCode: `${prefixEmployeeCode}${employeeCode}`,
      status: UserStatusEnum.ACTIVE,
    };
    await this.staffProfileRepository.create(staffProfileData);
    await this.clearUsersCache(newUser.id);
    // Gửi tới personalEmail của nhân viên về thông tin email công ty và mật khẩu
    await this.mailService.sendCreatedAccountEmail({
      to: dto.personalEmail,
      name: dto.name,
      email: email,
      password: password,
    });
    return { ...newUser, email, password }; // trả về thông tin đăng nhập của người dùng mới cho admin
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // chặn bác sĩ, staff đổi email
    // vì email này của họ là email công ty tạo tự động, không được đổi
    if (
      user?.roles?.some((role) =>
        [
          RoleEnum.SUPER_ADMIN,
          RoleEnum.ADMIN,
          RoleEnum.DOCTOR,
          RoleEnum.NURSE,
          RoleEnum.STAFF,
        ].includes(role.name as RoleEnum),
      )
    ) {
      dto.email = undefined; // chặn đổi email
    }

    return this.update(id, dto);
  }

  async updateUserStatus(id: string, status: number): Promise<void> {
    return this.updateStatus(id, status as UserStatusEnum);
  }

  async searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto> {
    return this.usersRepository.searchUsers(query);
  }
}
