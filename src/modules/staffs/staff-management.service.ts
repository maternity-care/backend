import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { AccountStatus, ActiveStatus, FacilityStatus } from '../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { RoleEnum } from '../../common/constants/role.enum';
import { getActiveFacilityId, isSuperAdmin } from '../../common/helpers/facility-scope.helper';
import { parseSearch } from '../../common/helpers/search-builder';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Facility } from '../facilities/entities/facility.entity';
import { JobsService } from '../jobs/jobs.service';
import {
  IPermissionsService,
  PERMISSIONS_SERVICE,
} from '../permissions/interfaces/permissions-service.interface';
import {
  StaffPermission,
  StaffPermissionEffectEnum,
} from '../permissions/entities/staff-permission.entity';
import { Role } from '../roles/entities/role.entity';
import { IRolesService, ROLES_SERVICE } from '../roles/interfaces/roles-service.interface';
import { AdminCreateUserDto } from '../users/dto/request/admin-create-user.dto';
import { FacilityStaffAssignmentDto } from '../users/dto/request/facility-staff-assignment.dto';
import { SearchUserDto } from '../users/dto/request/search-user.dto';
import { UpdateUserDto } from '../users/dto/request/update-user.dto';
import { UserPermissionOverrideDto } from '../users/dto/request/user-permission-override.dto';
import { SearchUserResponseDto } from '../users/dto/response/search-user-response.dto';
import { UserStatusEnum } from '../users/users.enum';
import {
  IStaffProfileRepository,
  STAFF_PROFILE_REPOSITORY,
} from './interfaces/staff-profile-repository.interface';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffManagementService {
  private readonly logger = new Logger(StaffManagementService.name);

  constructor(
    @Inject(STAFF_PROFILE_REPOSITORY)
    private readonly staffProfileRepository: IStaffProfileRepository,
    @Inject(ROLES_SERVICE)
    private readonly rolesService: IRolesService,
    @Inject(PERMISSIONS_SERVICE)
    private readonly permissionsService: IPermissionsService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(StaffPermission)
    private readonly staffPermissionRepository: Repository<StaffPermission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(query: SearchUserDto, actor: AuthenticatedUser): Promise<SearchUserResponseDto> {
    const searchFilters = parseSearch(query.search);
    const searchValue = (field: string) =>
      searchFilters.find((filter) => filter.field === field)?.values[0]?.trim();

    const keyword =
      searchValue('keyword') || query.name || query.email || query.phone || query.cccd;
    const role = searchValue('role');
    const roleId = searchValue('roleId') || query.roleId;
    const requestedFacilityId = searchValue('facilityId') || query.facilityId;
    const status = searchValue('status') || query.status;
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const normalizedRole = role?.trim().toLowerCase();
    const normalizedRoleId = roleId?.trim();
    const actorIsSuperAdmin = isSuperAdmin(actor);
    const scopedFacilityId = actorIsSuperAdmin
      ? requestedFacilityId?.trim()
      : getActiveFacilityId(actor);

    const staffs = await this.staffProfileRepository.findAll();
    const filteredStaffs = staffs.filter((staff) => {
      if (status && staff.status !== status) return false;
      if (scopedFacilityId && String(staff.facilityId) !== String(scopedFacilityId)) return false;
      if (!actorIsSuperAdmin && this.hasRoleName(staff, RoleEnum.SUPER_ADMIN)) return false;
      if (
        normalizedKeyword &&
        ![staff.name, staff.email, staff.personalEmail, staff.phone, staff.employeeCode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedKeyword))
      ) {
        return false;
      }
      if (
        normalizedRole &&
        !(staff.roles ?? []).some((staffRole) => staffRole.name.toLowerCase() === normalizedRole)
      ) {
        return false;
      }
      if (
        normalizedRoleId &&
        !(staff.roles ?? []).some((staffRole) => String(staffRole.id) === normalizedRoleId)
      ) {
        return false;
      }
      return true;
    });

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const pagedStaffs = filteredStaffs.slice(offset, offset + limit);
    const staffsWithProfiles = await Promise.all(
      pagedStaffs.map((staff) => this.toManagementStaff(staff, actor)),
    );

    return {
      users: staffsWithProfiles as unknown as SearchUserResponseDto['users'],
      total: filteredStaffs.length,
    };
  }

  async findById(id: string, actor: AuthenticatedUser) {
    await this.assertStaffAccess(id, actor);
    const staff = await this.staffProfileRepository.findById(id);
    console.log('============================', staff);
    return staff ? await this.toManagementStaff(staff, actor) : null;
  }

  async create(dto: AdminCreateUserDto, actor: AuthenticatedUser) {
    this.assertSingleFacilityAssignment(dto.facilityAssignments);
    this.assertNoSuperAdminAssignment(dto.facilityAssignments);
    const facilityAssignments = this.getScopedAssignments(dto.facilityAssignments, actor);
    const assignments = await this.resolveFacilityAssignments(facilityAssignments);
    const hasDoctorRole = facilityAssignments.some((assignment) =>
      assignment.roles.includes(RoleEnum.DOCTOR),
    );

    if (hasDoctorRole) {
      if (!dto.licenseNo || !dto.title || !dto.specialty || dto.yearsOfExperience === undefined) {
        throw new BadRequestException('Nhân viên có chức vụ bác sĩ phải có đầy đủ hồ sơ bác sĩ.');
      }
      const existingDoctor = await this.doctorRepository.findOne({
        where: { licenseNo: dto.licenseNo },
      });
      if (existingDoctor) {
        throw new ConflictException('Số giấy phép hành nghề đã tồn tại.');
      }
    }

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
      avatar: dto?.avatar,
      password: await bcrypt.hash(
        password,
        this.configService.getOrThrow<number>('bcrypt.saltRounds'),
      ),
      personalEmail: dto.personalEmail,
      employeeCode: `${this.getPositionCodePrefix(facilityAssignments)}${employeeCode}`,
      facilityId: assignments[0]?.facilityId,
      address: '',
      status: UserStatusEnum.ACTIVE,
      roles: [],
    });

    await this.syncFacilityAssignments(staff.id, assignments);
    await this.syncPermissionOverrides(staff.id, dto.permissionOverrides);
    if (hasDoctorRole) {
      await this.syncDoctorProfile(staff.id, dto);
    }
    try {
      await this.jobsService.enqueueCreatedAccountEmail({
        to: dto.personalEmail,
        name: dto.name,
        email,
        password,
      });
    } catch (error) {
      this.logger.warn(
        `Could not enqueue created account email for staff ${staff.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const freshStaff = await this.staffProfileRepository.findById(staff.id);
    return this.toManagementStaff(freshStaff ?? staff, actor);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    await this.assertStaffAccess(id, actor);
    if (dto.facilityAssignments) {
      this.assertSingleFacilityAssignment(dto.facilityAssignments);
      this.assertNoSuperAdminAssignment(dto.facilityAssignments);
    }
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
    staff.avatar = dto.avatar ?? staff.avatar;
    await this.staffProfileRepository.save(staff);
    await this.syncPermissionOverrides(staff.id, dto.permissionOverrides);

    if (assignments) {
      await this.syncFacilityAssignments(
        staff.id,
        assignments,
        actor ? getActiveFacilityId(actor) : null,
      );
    }

    const shouldSyncDoctor =
      (await this.hasDoctorRole(staff.id)) &&
      (Boolean(assignments) ||
        this.hasDoctorPayload(dto) ||
        !(await this.findDoctorByStaffId(staff.id)));
    if (shouldSyncDoctor) {
      await this.syncDoctorProfile(staff.id, dto);
    }

    const freshStaff = await this.staffProfileRepository.findById(staff.id);
    return this.toManagementStaff(freshStaff ?? staff, actor);
  }

  async updateStatus(id: string, status: AccountStatus, actor: AuthenticatedUser) {
    await this.assertStaffAccess(id, actor);
    const staff = await this.staffProfileRepository.findById(id);
    if (!staff) throw new NotFoundException('Không tìm thấy nhân viên.');
    staff.status = status;
    await this.staffProfileRepository.save(staff);
  }

  private async syncPermissionOverrides(
    staffId: string,
    overrides?: UserPermissionOverrideDto[],
  ): Promise<void> {
    if (overrides === undefined) return;

    const uniqueOverrides = Array.from(
      new Map(overrides.map((override) => [override.permissionId, override])).values(),
    );
    const permissions = await this.permissionsService.findByIds(
      uniqueOverrides.map((override) => override.permissionId),
    );

    if (permissions.length !== uniqueOverrides.length) {
      throw new NotFoundException('One or more permissions were not found');
    }

    await this.staffPermissionRepository.delete({ staffId });
    if (uniqueOverrides.length === 0) return;

    await this.staffPermissionRepository.save(
      uniqueOverrides.map((override) =>
        this.staffPermissionRepository.create({
          staffId,
          permissionId: override.permissionId,
          effect: override.effect as StaffPermissionEffectEnum,
        }),
      ),
    );
  }

  private async syncFacilityAssignments(
    staffId: string,
    assignments: ResolvedFacilityAssignment[],
    facilityScopeId: string | null = null,
  ): Promise<void> {
    const staff = await this.staffProfileRepository.findById(staffId);
    if (!staff) throw new NotFoundException('Không tìm thấy nhân viên.');

    const scopedAssignments = facilityScopeId
      ? assignments.filter(
          (assignment) => String(assignment.facilityId) === String(facilityScopeId),
        )
      : assignments;
    const roleIds = [...new Set(scopedAssignments.map((assignment) => assignment.roleId))];
    const roles = roleIds.length > 0 ? await this.roleRepository.findBy({ id: In(roleIds) }) : [];

    staff.facilityId = scopedAssignments[0]?.facilityId ?? staff.facilityId;
    staff.roles = roles;
    await this.staffProfileRepository.save(staff);
  }

  private async hasDoctorRole(staffId: string): Promise<boolean> {
    const staff = await this.staffProfileRepository.findById(staffId);
    return Boolean(staff?.roles?.some((role) => role.name === RoleEnum.DOCTOR));
  }

  private hasDoctorPayload(dto: DoctorProfileInput): boolean {
    return (
      dto.licenseNo !== undefined ||
      dto.title !== undefined ||
      dto.specialty !== undefined ||
      dto.yearsOfExperience !== undefined ||
      dto.bio !== undefined
    );
  }

  private findDoctorByStaffId(staffId: string): Promise<Doctor | null> {
    return this.doctorRepository.findOne({ where: { staffId } });
  }

  private async syncDoctorProfile(staffId: string, dto: DoctorProfileInput): Promise<void> {
    const doctor = await this.findDoctorByStaffId(staffId);
    if (
      !doctor &&
      (!dto.licenseNo || !dto.title || !dto.specialty || dto.yearsOfExperience === undefined)
    ) {
      throw new BadRequestException('Nhân viên có chức vụ bác sĩ phải có đầy đủ hồ sơ bác sĩ.');
    }

    if (dto.licenseNo && dto.licenseNo !== doctor?.licenseNo) {
      const existingDoctor = await this.doctorRepository.findOne({
        where: { licenseNo: dto.licenseNo },
      });
      if (existingDoctor && existingDoctor.staffId !== staffId) {
        throw new ConflictException('Số giấy phép hành nghề đã tồn tại.');
      }
    }

    await this.doctorRepository.save(
      this.doctorRepository.create({
        ...doctor,
        staffId,
        licenseNo: dto.licenseNo ?? doctor!.licenseNo,
        title: dto.title ?? doctor!.title,
        specialty: dto.specialty ?? doctor!.specialty,
        yearsOfExperience: dto.yearsOfExperience ?? doctor!.yearsOfExperience,
        workingRoomTypeId: dto.workingRoomTypeId ?? doctor?.workingRoomTypeId,
        bio: dto.bio ?? doctor?.bio ?? '',
        status: doctor?.status ?? ActiveStatus.ACTIVE,
      }),
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
      throw new ForbiddenException('Admin chỉ được phân công nhân viên tại cơ sở đang làm việc.');
    }
    return assignments;
  }

  private async assertStaffAccess(staffId: string, actor?: AuthenticatedUser): Promise<void> {
    if (!actor || isSuperAdmin(actor)) return;
    const activeFacilityId = getActiveFacilityId(actor);
    if (!activeFacilityId) {
      throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_SELECTION_REQUIRED);
    }

    const staff = await this.staffProfileRepository.findById(staffId);
    if (
      !staff ||
      String(staff.facilityId) !== String(activeFacilityId) ||
      this.hasRoleName(staff, RoleEnum.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Bạn không có quyền thao tác nhân viên ngoài cơ sở đang chọn.');
    }
  }

  private hasRoleName(staff: Staff, roleName: RoleEnum | string): boolean {
    return (staff.roles ?? []).some((role) => role.name === roleName);
  }

  private assertNoSuperAdminAssignment(assignments?: FacilityStaffAssignmentDto[]): void {
    if (
      assignments?.some((assignment) =>
        assignment.roles.some((role) => String(role) === RoleEnum.SUPER_ADMIN),
      )
    ) {
      throw new ForbiddenException('Không được gán Super Admin từ màn quản lý nhân viên.');
    }
  }

  private assertSingleFacilityAssignment(assignments?: FacilityStaffAssignmentDto[]): void {
    if (!assignments || assignments.length !== 1) {
      throw new BadRequestException('Mỗi nhân viên chỉ được thuộc một cơ sở.');
    }
  }

  private async resolveFacilityAssignments(
    assignments: FacilityStaffAssignmentDto[],
  ): Promise<ResolvedFacilityAssignment[]> {
    this.assertSingleFacilityAssignment(assignments);
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

    return Promise.all(
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
  }

  private async toManagementStaff(
    staff: Staff,
    actor?: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    const staffProfile = await this.getStaffProfileSummary(staff.id, actor);
    const { password: _password, ...safeStaff } = staff;
    return {
      ...safeStaff,
      permissionOverrides: (staff.permissions ?? []).map((override) => ({
        permission: override.permission,
        effect: override.effect,
      })),
      staffProfile,
    };
  }

  private async getStaffProfileSummary(
    staffId: string,
    actor?: AuthenticatedUser,
  ): Promise<StaffProfileSummary | null> {
    const staff = await this.staffProfileRepository.findById(staffId);
    if (!staff) return null;
    const doctor = await this.doctorRepository.findOne({ where: { staffId } });
    return {
      id: staff.id,
      staffId: staff.id,
      personalEmail: staff.personalEmail,
      employeeCode: staff.employeeCode,
      status: staff.status,
      facilityAssignments: staff.facilityId
        ? [
            {
              facilityId: String(staff.facilityId),
              roles: (staff.roles ?? []).map((role) => role.name),
            },
          ]
        : [],
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

interface ResolvedFacilityAssignment {
  facilityId: string;
  roleId: string;
}

interface DoctorProfileInput {
  licenseNo?: string;
  title?: string;
  specialty?: string;
  yearsOfExperience?: number;
  workingRoomTypeId?: string;
  bio?: string;
}

interface StaffProfileSummary {
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
