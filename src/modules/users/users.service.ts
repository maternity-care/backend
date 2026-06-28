import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
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
import { FacilityStaff } from '../facilities/entities/facility-staff.entity';
import { Facility } from '../facilities/entities/facilities.entity';
import { StaffProfile } from '../staffs/entities/staff-profiles.entity';
import { Doctor } from '../doctors/entities/doctors.entity';
import { FacilityStaffAssignmentDto } from './dto/request/facility-staff-assignment.dto';
import {
  AccountStatus,
  ActiveStatus,
  FacilityStatus,
} from '../../common/constants/status.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  getActiveFacilityId,
  isSuperAdmin,
} from '../../common/helpers/facility-scope.helper';

const GLOBAL_USER_ROLES = new Set<string>([
  RoleEnum.MEMBER,
  RoleEnum.PARTNER,
  RoleEnum.SUPER_ADMIN,
]);

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
    @InjectRepository(FacilityStaff)
    private readonly facilityStaffRepository: Repository<FacilityStaff>,
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.');
    }

    const saltRounds = this.configService.getOrThrow<number>('bcrypt.saltRounds');
    const roles = dto.roleIds
      ? await this.rolesService.findByIds(dto.roleIds)
      : [await this.rolesService.findByName(RoleEnum.MEMBER)].filter(
          (role): role is NonNullable<typeof role> => Boolean(role),
        );
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto?.phone ? dto.phone : undefined,
      password: await bcrypt.hash(dto.password, saltRounds),
      roles,
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
      const roles = await this.rolesService.findByIds(dto.roleIds);
      if (roles.some((role) => !GLOBAL_USER_ROLES.has(role.name))) {
        throw new BadRequestException(
          'Role admin, doctor, nurse và staff phải được gán theo cơ sở.',
        );
      }
      user.roles = roles;
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

  async findAllUsers(
    query: SearchUserDto,
    actor?: AuthenticatedUser,
  ): Promise<SearchUserResponseDto> {
    const allStaffs = await this.staffProfileRepository.findAll();
    const activeFacilityId = actor ? getActiveFacilityId(actor) : null;
    const allowedStaffIds = activeFacilityId
      ? new Set(
          (
            await this.facilityStaffRepository.find({
              where: {
                facilityId: activeFacilityId,
                status: ActiveStatus.ACTIVE,
              },
              select: { staffId: true },
            })
          ).map((assignment) => assignment.staffId),
        )
      : null;
    const keyword = query.name?.toLowerCase();
    const staffs = allStaffs.filter((staff) => {
      if (allowedStaffIds && !allowedStaffIds.has(staff.id)) return false;
      if (keyword && !staff.name.toLowerCase().includes(keyword)) return false;
      if (query.email && !staff.email.toLowerCase().includes(query.email.toLowerCase())) return false;
      if (query.phone && !staff.phone?.includes(query.phone)) return false;
      if (query.status !== undefined && staff.status !== query.status) return false;
      return true;
    });
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const items = staffs.slice((page - 1) * limit, page * limit);
    return {
      users: (await Promise.all(
        items.map((staff) => this.toManagementStaff(staff, actor)),
      )) as unknown as User[],
      total: staffs.length,
    };
  }

  async findUserById(
    id: string,
    actor?: AuthenticatedUser,
  ): Promise<User | null> {
    await this.assertStaffAccess(id, actor);
    const staff = await this.staffProfileRepository.findById(id);
    return staff
      ? (await this.toManagementStaff(staff, actor) as unknown as User)
      : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.staffProfileRepository.findByEmail(email) as unknown as Promise<User | null>;
  }

  async createUser(
    dto: AdminCreateUserDto,
    actor?: AuthenticatedUser,
  ): Promise<User> {
    const facilityAssignments = this.getScopedAssignments(
      dto.facilityAssignments,
      actor,
    );
    const assignments = await this.resolveFacilityAssignments(facilityAssignments);
    const hasDoctorRole = facilityAssignments.some(
      (assignment) => assignment.roles.includes(RoleEnum.DOCTOR),
    );
    if (hasDoctorRole) {
      if (
        !dto.licenseNo ||
        !dto.title ||
        !dto.specialty ||
        dto.yearsOfExperience === undefined
      ) {
        throw new BadRequestException(
          'Nhân viên có chức vụ bác sĩ phải có đầy đủ hồ sơ bác sĩ.',
        );
      }
      const existingDoctor = await this.doctorRepository.findOne({
        where: { licenseNo: dto.licenseNo },
      });
      if (existingDoctor) {
        throw new ConflictException('Số giấy phép hành nghề đã tồn tại.');
      }
    }
    // check personal email của nhân viên đã tồn tại trong hệ thống chưa
    const isPersonalEmailExists = await this.staffProfileRepository.checkPersonalEmailExists(
      dto.personalEmail,
    );
    if (isPersonalEmailExists) {
      throw new ConflictException(
        'Email cá nhân đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.',
      );
    }

    const email = await this.staffProfileRepository.generateStaffEmailFromName(dto.name);
    const password = this.staffProfileRepository.generateStaffPassword();
    const employeeCode = await this.staffProfileRepository.generateStaffEmployeeCode();
    const staff = await this.staffProfileRepository.create({
      name: dto.name,
      email,
      phone: dto.phone,
      password: await bcrypt.hash(
        password,
        this.configService.getOrThrow<number>('bcrypt.saltRounds'),
      ),
      personalEmail: dto.personalEmail,
      employeeCode: `${this.getPositionCodePrefix(facilityAssignments)}${employeeCode}`,
      status: UserStatusEnum.ACTIVE,
      roles: [],
    });
    await this.syncFacilityAssignments(staff.id, assignments);
    if (hasDoctorRole) {
      await this.doctorRepository.save(
        this.doctorRepository.create({
          staffId: staff.id,
          licenseNo: dto.licenseNo!,
          title: dto.title!,
          specialty: dto.specialty!,
          yearsOfExperience: dto.yearsOfExperience!,
          bio: dto.bio,
          status: ActiveStatus.ACTIVE,
        }),
      );
    }
    await this.mailService.sendCreatedAccountEmail({
      to: dto.personalEmail,
      name: dto.name,
      email: email,
      password: password,
    });
    return {
      ...(await this.toManagementStaff(staff, actor) as unknown as User),
      password,
    };
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    actor?: AuthenticatedUser,
  ): Promise<User> {
    await this.assertStaffAccess(id, actor);
    const facilityAssignments = dto.facilityAssignments
      ? this.getScopedAssignments(dto.facilityAssignments, actor)
      : null;
    const assignments = facilityAssignments
      ? await this.resolveFacilityAssignments(facilityAssignments)
      : null;
    const staff = await this.staffProfileRepository.findById(id);
    if (!staff) throw new NotFoundException('Không tìm thấy nhân viên.');
    staff.name = dto.name ?? staff.name;
    staff.phone = dto.phone ?? staff.phone;
    staff.status = dto.status ?? staff.status;
    if (dto.password) {
      staff.password = await bcrypt.hash(
        dto.password,
        this.configService.getOrThrow<number>('bcrypt.saltRounds'),
      );
    }
    const updatedStaff = await this.staffProfileRepository.save(staff);
    if (assignments) {
      await this.syncFacilityAssignments(
        staff.id,
        assignments,
        actor ? getActiveFacilityId(actor) : null,
      );
      const hasDoctorRole = facilityAssignments!.some((assignment) =>
        assignment.roles.includes(RoleEnum.DOCTOR),
      );
      if (hasDoctorRole) {
        const doctor = await this.doctorRepository.findOne({
          where: { staffId: staff.id },
        });
        if (!doctor && (!dto.licenseNo || !dto.title || !dto.specialty ||
          dto.yearsOfExperience === undefined)) {
          throw new BadRequestException(
            'Nhân viên có chức vụ bác sĩ phải có đầy đủ hồ sơ bác sĩ.',
          );
        }
        await this.doctorRepository.save(
          this.doctorRepository.create({
            ...doctor,
            staffId: staff.id,
            licenseNo: dto.licenseNo ?? doctor!.licenseNo,
            title: dto.title ?? doctor!.title,
            specialty: dto.specialty ?? doctor!.specialty,
            yearsOfExperience:
              dto.yearsOfExperience ?? doctor!.yearsOfExperience,
            bio: dto.bio ?? doctor?.bio,
            status: doctor?.status ?? ActiveStatus.ACTIVE,
          }),
        );
      }
    }
    return await this.toManagementStaff(updatedStaff, actor) as unknown as User;
  }

  async updateUserStatus(
    id: string,
    status: AccountStatus,
    actor?: AuthenticatedUser,
  ): Promise<void> {
    await this.assertStaffAccess(id, actor);
    const staff = await this.staffProfileRepository.findById(id);
    if (!staff) throw new NotFoundException('Không tìm thấy nhân viên.');
    staff.status = status;
    await this.staffProfileRepository.save(staff);
  }

  async searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto> {
    return this.usersRepository.searchUsers(query);
  }

  private async syncFacilityAssignments(
    staffId: string,
    assignments: ResolvedFacilityAssignment[],
    facilityScopeId: string | null = null,
  ): Promise<void> {
    await this.facilityStaffRepository.delete(
      facilityScopeId
        ? { staffId, facilityId: facilityScopeId }
        : { staffId },
    );
    await this.facilityStaffRepository.save(
      assignments.map(({ facilityId, roleId }) =>
        this.facilityStaffRepository.create({
          staffId,
          facilityId,
          roleId,
          status: ActiveStatus.ACTIVE,
          assignedAt: new Date(),
        }),
      ),
    );
  }

  private getScopedAssignments(
    assignments: FacilityStaffAssignmentDto[],
    actor?: AuthenticatedUser,
  ): FacilityStaffAssignmentDto[] {
    if (!actor || isSuperAdmin(actor)) return assignments;
    const activeFacilityId = getActiveFacilityId(actor);
    if (
      !activeFacilityId ||
      assignments.length !== 1 ||
      String(assignments[0].facilityId) !== String(activeFacilityId)
    ) {
      throw new ForbiddenException(
        'Admin chỉ được phân công nhân viên tại cơ sở đang làm việc.',
      );
    }
    return assignments;
  }

  private async assertStaffAccess(
    staffId: string,
    actor?: AuthenticatedUser,
  ): Promise<void> {
    if (!actor || isSuperAdmin(actor)) return;
    const activeFacilityId = getActiveFacilityId(actor);
    if (!activeFacilityId) {
      throw new ForbiddenException('Vui lòng chọn cơ sở làm việc.');
    }
    const assignment = await this.facilityStaffRepository.findOne({
      where: {
        staffId,
        facilityId: activeFacilityId,
        status: ActiveStatus.ACTIVE,
      },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'Bạn chỉ được quản lý nhân viên thuộc cơ sở đang chọn.',
      );
    }
  }

  private async resolveFacilityAssignments(
    assignments: FacilityStaffAssignmentDto[],
  ): Promise<ResolvedFacilityAssignment[]> {
    if (assignments.length === 0) {
      throw new ConflictException('Nhân viên phải thuộc ít nhất một cơ sở.');
    }
    const uniqueAssignments = new Map<string, FacilityStaffAssignmentDto>();
    for (const assignment of assignments) {
      const facilityId = String(assignment.facilityId);
      if (uniqueAssignments.has(facilityId)) {
        throw new ConflictException('Mỗi cơ sở chỉ được gán một chức vụ cho nhân viên.');
      }
      uniqueAssignments.set(facilityId, {
        ...assignment,
        facilityId,
        roles: [...new Set(assignment.roles)],
      });
    }
    const facilityIds = [...uniqueAssignments.keys()];

    const count = await this.facilityRepository.count({
      where: {
        id: In(facilityIds),
        status: In([FacilityStatus.ACTIVE]),
      },
    });
    if (count !== facilityIds.length) {
      throw new NotFoundException('Một hoặc nhiều cơ sở không tồn tại hoặc đã ngừng hoạt động.');
    }

    const resolved = await Promise.all(
      [...uniqueAssignments.values()].flatMap(({ facilityId, roles }) =>
        roles.map(async (role) => {
          const roleEntity = await this.rolesService.findByName(role);
          if (!roleEntity) {
            throw new NotFoundException(`Không tìm thấy role ${role}.`);
          }
          return { facilityId, roleId: roleEntity.id };
        }),
      ),
    );
    return resolved;
  }

  private async toManagementStaff(
    profile: StaffProfile,
    actor?: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    const staffProfile = await this.getStaffProfileSummary(profile.id, actor);
    return {
      ...profile,
      staffProfile,
    };
  }

  private async getStaffProfileSummary(
    staffId: string,
    actor?: AuthenticatedUser,
  ): Promise<StaffProfileSummary | null> {
    const profile = await this.staffProfileRepository.findById(staffId);
    if (!profile) return null;
    const activeFacilityId = actor ? getActiveFacilityId(actor) : null;
    const assignments = await this.facilityStaffRepository.find({
      where: {
        staffId: profile.id,
        status: ActiveStatus.ACTIVE,
        ...(activeFacilityId ? { facilityId: activeFacilityId } : {}),
      },
      relations: { role: true },
    });
    const doctor = await this.doctorRepository.findOne({ where: { staffId } });
    return {
      id: profile.id,
      staffId: profile.id,
      personalEmail: profile.personalEmail,
      employeeCode: profile.employeeCode,
      status: profile.status,
      facilityAssignments: Object.values(
        assignments.reduce<Record<string, { facilityId: string; roles: string[] }>>(
          (result, assignment) => {
            result[assignment.facilityId] ??= {
              facilityId: assignment.facilityId,
              roles: [],
            };
            result[assignment.facilityId].roles.push(assignment.role.name);
            return result;
          },
          {},
        ),
      ),
      doctor: doctor
        ? {
            id: doctor.id,
            licenseNo: doctor.licenseNo,
            title: doctor.title,
            specialty: doctor.specialty,
            yearsOfExperience: doctor.yearsOfExperience,
            bio: doctor.bio,
            status: doctor.status,
          }
        : null,
    };
  }

  private getPositionCodePrefix(assignments: FacilityStaffAssignmentDto[]): string {
    const roles = new Set(assignments.flatMap((assignment) => assignment.roles));
    if (roles.has(RoleEnum.ADMIN)) return 'AD';
    if (roles.has(RoleEnum.DOCTOR)) return 'DR';
    if (roles.has(RoleEnum.NURSE)) return 'NU';
    return 'ST';
  }

}

export interface StaffProfileSummary {
  id: string;
  staffId: string;
  personalEmail: string;
  employeeCode: string;
  status: AccountStatus;
  facilityAssignments: Array<{ facilityId: string; roles: string[] }>;
  doctor: DoctorSummary | null;
}

interface DoctorSummary {
  id: string;
  licenseNo: string;
  title: string;
  specialty: string;
  yearsOfExperience: number;
  bio: string;
  status: ActiveStatus;
}

interface ResolvedFacilityAssignment {
  facilityId: string;
  roleId: string;
}
