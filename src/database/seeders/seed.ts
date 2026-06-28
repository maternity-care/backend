import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import dataSource from '../typeorm.config';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { Setting } from '../../modules/settings/entities/setting.entity';
import { User } from '../../modules/users/entities/user.entity';
import { StaffProfile } from '../../modules/staffs/entities/staff-profiles.entity';
import {
  AccountStatus,
  ActiveStatus,
  FacilityStatus,
} from '../../common/constants/status.enum';
import { Facility } from '../../modules/facilities/entities/facilities.entity';
import { FacilityStaff } from '../../modules/facilities/entities/facility-staff.entity';
import { Doctor } from '../../modules/doctors/entities/doctors.entity';

type SeederClass =
  | 'DatabaseSeeder'
  | 'RolesAndPermissionsSeeder'
  | 'UsersSeeder'
  | 'FacilitiesAndStaffSeeder'
  | 'SettingsSeeder';

interface SeedUser {
  name: string;
  email: string;
  phone: string;
  role: RoleEnum;
}

const rolePermissionMap: Record<RoleEnum, PermissionEnum[]> = {
  [RoleEnum.SUPER_ADMIN]: Object.values(PermissionEnum),
  [RoleEnum.ADMIN]: Object.values(PermissionEnum),
  [RoleEnum.DOCTOR]: [
    PermissionEnum.MEMBER_VIEW,
    PermissionEnum.MEMBER_MEDICAL_VIEW,
    PermissionEnum.PREGNANCY_VIEW,
    PermissionEnum.PREGNANCY_UPDATE,
    PermissionEnum.HEALTH_METRIC_VIEW,
    PermissionEnum.HEALTH_METRIC_CREATE,
    PermissionEnum.HEALTH_METRIC_UPDATE,
    PermissionEnum.APPOINTMENT_VIEW,
    PermissionEnum.APPOINTMENT_UPDATE,
    PermissionEnum.MEDICAL_RECORD_VIEW,
    PermissionEnum.MEDICAL_RECORD_CREATE,
    PermissionEnum.MEDICAL_RECORD_UPDATE,
    PermissionEnum.MEDICAL_RECORD_SENSITIVE_VIEW,
    PermissionEnum.REMINDER_VIEW,
    PermissionEnum.CHECKLIST_VIEW,
    PermissionEnum.CONSULTATION_VIEW,
    PermissionEnum.CONSULTATION_REPLY,
  ],
  [RoleEnum.NURSE]: [
    PermissionEnum.MEMBER_VIEW,
    PermissionEnum.PREGNANCY_VIEW,
    PermissionEnum.HEALTH_METRIC_VIEW,
    PermissionEnum.HEALTH_METRIC_CREATE,
    PermissionEnum.HEALTH_METRIC_UPDATE,
    PermissionEnum.APPOINTMENT_VIEW,
    PermissionEnum.APPOINTMENT_UPDATE,
    PermissionEnum.REMINDER_VIEW,
    PermissionEnum.REMINDER_CREATE,
    PermissionEnum.REMINDER_UPDATE,
    PermissionEnum.CHECKLIST_VIEW,
    PermissionEnum.CHECKLIST_UPDATE,
    PermissionEnum.CONSULTATION_VIEW,
    PermissionEnum.CONSULTATION_REPLY,
  ],
  [RoleEnum.STAFF]: [
    PermissionEnum.MEMBER_VIEW,
    PermissionEnum.APPOINTMENT_VIEW,
    PermissionEnum.APPOINTMENT_CREATE,
    PermissionEnum.APPOINTMENT_UPDATE,
    PermissionEnum.APPOINTMENT_CANCEL,
    PermissionEnum.CONSULTATION_VIEW,
    PermissionEnum.CONSULTATION_REPLY,
    PermissionEnum.CONSULTATION_CLOSE,
    PermissionEnum.SERVICE_PACKAGE_VIEW,
    PermissionEnum.PAYMENT_VIEW,
    PermissionEnum.ARTICLE_VIEW,
  ],
  [RoleEnum.MEMBER]: [
    PermissionEnum.PREGNANCY_VIEW,
    PermissionEnum.PREGNANCY_CREATE,
    PermissionEnum.PREGNANCY_UPDATE,
    PermissionEnum.PREGNANCY_SHARE,
    PermissionEnum.HEALTH_METRIC_VIEW,
    PermissionEnum.HEALTH_METRIC_CREATE,
    PermissionEnum.APPOINTMENT_VIEW,
    PermissionEnum.APPOINTMENT_CREATE,
    PermissionEnum.APPOINTMENT_CANCEL,
    PermissionEnum.MEDICAL_RECORD_VIEW,
    PermissionEnum.REMINDER_VIEW,
    PermissionEnum.REMINDER_CREATE,
    PermissionEnum.REMINDER_UPDATE,
    PermissionEnum.CHECKLIST_VIEW,
    PermissionEnum.CHECKLIST_UPDATE,
    PermissionEnum.CONSULTATION_VIEW,
    PermissionEnum.CONSULTATION_CREATE,
    PermissionEnum.ARTICLE_VIEW,
    PermissionEnum.SERVICE_PACKAGE_VIEW,
    PermissionEnum.PAYMENT_VIEW,
  ],
  [RoleEnum.PARTNER]: [
    PermissionEnum.PREGNANCY_VIEW,
    PermissionEnum.HEALTH_METRIC_VIEW,
    PermissionEnum.APPOINTMENT_VIEW,
    PermissionEnum.MEDICAL_RECORD_VIEW,
    PermissionEnum.REMINDER_VIEW,
    PermissionEnum.CHECKLIST_VIEW,
    PermissionEnum.ARTICLE_VIEW,
  ],
};

const seedUsers: SeedUser[] = [
  { name: 'Member Demo', email: 'member@example.com', phone: '0987654326', role: RoleEnum.MEMBER },
  {
    name: 'Partner Demo',
    email: 'partner@example.com',
    phone: '0987654327',
    role: RoleEnum.PARTNER,
  },
];

const seedSettings: Array<Pick<Setting, 'key' | 'value' | 'group' | 'isPublic'>> = [
  {
    key: 'site.name',
    value: 'Maternity Care',
    group: 'general',
    isPublic: 1,
  },
  {
    key: 'site.description',
    value: 'Maternity care management system',
    group: 'general',
    isPublic: 1,
  },
  {
    key: 'contact.email',
    value: 'support@example.com',
    group: 'contact',
    isPublic: 1,
  },
  {
    key: 'contact.phone',
    value: '',
    group: 'contact',
    isPublic: 1,
  },
  {
    key: 'appointment.reminder_hours',
    value: 24,
    group: 'appointment',
    isPublic: 0,
  },
  {
    key: 'upload.max_file_size_mb',
    value: 10,
    group: 'upload',
    isPublic: 0,
  },
];

class RolesAndPermissionsSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    const permissionRepository = this.connection.getRepository(Permission);
    const roleRepository = this.connection.getRepository(Role);

    const permissions = new Map<PermissionEnum, Permission>();

    for (const permissionName of Object.values(PermissionEnum)) {
      let permission = await permissionRepository.findOne({ where: { name: permissionName } });

      if (!permission) {
        permission = permissionRepository.create({ name: permissionName, guardName: 'api' });
      }

      permission.guardName = 'api';
      const savedPermission = await permissionRepository.save(permission);
      permissions.set(permissionName, savedPermission);
    }

    for (const roleName of Object.values(RoleEnum)) {
      let role = await roleRepository.findOne({
        where: { name: roleName },
        relations: { permissions: true },
      });

      if (!role) {
        role = roleRepository.create({ name: roleName, guardName: 'api', permissions: [] });
      }

      role.guardName = 'api';
      role.permissions = rolePermissionMap[roleName].map((permissionName) => {
        const permission = permissions.get(permissionName);

        if (!permission) {
          throw new Error(`Permission "${permissionName}" was not seeded`);
        }

        return permission;
      });

      await roleRepository.save(role);
    }
  }
}

class UsersSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    await new RolesAndPermissionsSeeder(this.connection).run();

    const roleRepository = this.connection.getRepository(Role);
    const userRepository = this.connection.getRepository(User);
    const staffRepository = this.connection.getRepository(StaffProfile);
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const password = await bcrypt.hash('password', saltRounds);

    for (const seedUser of seedUsers) {
      const role = await roleRepository.findOneOrFail({
        where: { name: seedUser.role },
        relations: { permissions: true },
      });
      const existingUser = await userRepository.findOne({
        where: { email: seedUser.email },
        relations: { roles: true },
      });

      if (existingUser) {
        existingUser.name = seedUser.name;
        existingUser.status = AccountStatus.ACTIVE;
        existingUser.roles = [role];
        await userRepository.save(existingUser);
        continue;
      }

      const user = userRepository.create({
        name: seedUser.name,
        email: seedUser.email,
        phone: seedUser.phone,
        password,
        status: AccountStatus.ACTIVE,
        roles: [role],
      });
      await userRepository.save(user);
    }

    const superAdminRole = await roleRepository.findOneOrFail({
      where: { name: RoleEnum.SUPER_ADMIN },
      relations: { permissions: true },
    });
    let superAdmin = await staffRepository.findOne({
      where: { email: 'superadmin@example.com' },
      relations: { roles: true },
    });
    if (!superAdmin) {
      superAdmin = staffRepository.create({
        name: 'Super Administrator',
        email: 'superadmin@example.com',
        phone: '0987654321',
        password,
        personalEmail: 'superadmin@example.com',
        employeeCode: 'SA00000001',
        status: AccountStatus.ACTIVE,
        roles: [superAdminRole],
      });
    } else {
      superAdmin.password = password;
      superAdmin.status = AccountStatus.ACTIVE;
      superAdmin.roles = [superAdminRole];
    }
    await staffRepository.save(superAdmin);
  }
}

const seedFacilities = [
  {
    code: 'DEMO-HN',
    name: 'Maternity Care Hà Nội',
    phone: '02473001234',
    email: 'hanoi@maternity-care.local',
    address: '123 Trần Duy Hưng',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Trung Hòa',
    latitude: '21.0075000',
    longitude: '105.8019000',
  },
  {
    code: 'DEMO-HCM',
    name: 'Maternity Care Hồ Chí Minh',
    phone: '02873001234',
    email: 'hcm@maternity-care.local',
    address: '456 Nguyễn Thị Minh Khai',
    province: 'Hồ Chí Minh',
    district: 'Quận 3',
    ward: 'Phường 5',
    latitude: '10.7756000',
    longitude: '106.6871000',
  },
];

const seedFacilityStaff = [
  { role: RoleEnum.ADMIN, name: 'Admin', phone: '0901000001' },
  { role: RoleEnum.DOCTOR, name: 'Bác sĩ', phone: '0901000002' },
  { role: RoleEnum.NURSE, name: 'Điều dưỡng', phone: '0901000003' },
  { role: RoleEnum.STAFF, name: 'Nhân viên', phone: '0901000004' },
];

class FacilitiesAndStaffSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    await new RolesAndPermissionsSeeder(this.connection).run();
    const facilityRepository = this.connection.getRepository(Facility);
    const staffRepository = this.connection.getRepository(StaffProfile);
    const assignmentRepository = this.connection.getRepository(FacilityStaff);
    const roleRepository = this.connection.getRepository(Role);
    const doctorRepository = this.connection.getRepository(Doctor);
    const password = await bcrypt.hash(
      'password',
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );

    for (const [facilityIndex, facilityData] of seedFacilities.entries()) {
      const existingFacility = await facilityRepository.findOne({
        where: { code: facilityData.code },
      });
      const facility = await facilityRepository.save(
        facilityRepository.create({
          ...existingFacility,
          ...facilityData,
          status: FacilityStatus.ACTIVE,
        }),
      );

      for (const [staffIndex, staffData] of seedFacilityStaff.entries()) {
        const email =
          `${staffData.role}.${facilityData.code.toLowerCase()}@example.com`;
        const existingStaff = await staffRepository.findOne({
          where: { email },
          relations: { roles: true },
        });
        const staff = await staffRepository.save(
          staffRepository.create({
            ...existingStaff,
            name: `${staffData.name} ${facility.name}`,
            email,
            phone:
              `090${facilityIndex + 1}${String(staffIndex + 1).padStart(6, '0')}`,
            password,
            personalEmail: email,
            employeeCode:
              `DEMO${facilityIndex + 1}${String(staffIndex + 1).padStart(2, '0')}`,
            status: AccountStatus.ACTIVE,
            roles: [],
          }),
        );
        const role = await roleRepository.findOneOrFail({
          where: { name: staffData.role },
        });
        await assignmentRepository.save(
          assignmentRepository.create({
            facilityId: facility.id,
            staffId: staff.id,
            roleId: role.id,
            status: ActiveStatus.ACTIVE,
            assignedAt: new Date(),
          }),
        );

        if (staffData.role === RoleEnum.DOCTOR) {
          const doctor = await doctorRepository.findOne({
            where: { staffId: staff.id },
          });
          await doctorRepository.save(
            doctorRepository.create({
              ...doctor,
              staffId: staff.id,
              licenseNo: `DEMO-LICENSE-${facilityIndex + 1}`,
              title: 'Bác sĩ chuyên khoa I',
              specialty: 'Sản phụ khoa',
              yearsOfExperience: 8,
              bio: `Bác sĩ mẫu tại ${facility.name}.`,
              status: ActiveStatus.ACTIVE,
            }),
          );
        }
      }
    }
  }
}

class SettingsSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    const settingRepository = this.connection.getRepository(Setting);

    for (const seedSetting of seedSettings) {
      let setting = await settingRepository.findOne({
        where: { key: seedSetting.key },
      });

      if (!setting) {
        setting = settingRepository.create(seedSetting);
      }

      setting.value = seedSetting.value;
      setting.group = seedSetting.group;
      setting.isPublic = seedSetting.isPublic;

      await settingRepository.save(setting);
    }
  }
}

class DatabaseSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    await new RolesAndPermissionsSeeder(this.connection).run();
    await new UsersSeeder(this.connection).run();
    await new FacilitiesAndStaffSeeder(this.connection).run();
    await new SettingsSeeder(this.connection).run();
  }
}

function resolveSeederClass(): SeederClass {
  const classArgument = process.argv.find((argument) => argument.startsWith('--class='));
  const nameArgument = process.argv.find((argument) => argument.startsWith('--name='));
  const requestedSeeder =
    classArgument?.replace('--class=', '') ??
    nameArgument?.replace('--name=', '') ??
    process.env.SEEDER_CLASS ??
    process.env.SEEDER_NAME ??
    'DatabaseSeeder';

  const aliases: Record<string, SeederClass> = {
    all: 'DatabaseSeeder',
    database: 'DatabaseSeeder',
    DatabaseSeeder: 'DatabaseSeeder',
    'roles-permissions': 'RolesAndPermissionsSeeder',
    roles: 'RolesAndPermissionsSeeder',
    permissions: 'RolesAndPermissionsSeeder',
    RolesAndPermissionsSeeder: 'RolesAndPermissionsSeeder',
    users: 'UsersSeeder',
    'admin-user': 'UsersSeeder',
    UsersSeeder: 'UsersSeeder',
    facilities: 'FacilitiesAndStaffSeeder',
    staff: 'FacilitiesAndStaffSeeder',
    'facilities-staff': 'FacilitiesAndStaffSeeder',
    FacilitiesAndStaffSeeder: 'FacilitiesAndStaffSeeder',
    settings: 'SettingsSeeder',
    SettingsSeeder: 'SettingsSeeder',
  };

  const seederClass = aliases[requestedSeeder];

  if (!seederClass) {
    throw new Error(
      `Unknown seeder "${requestedSeeder}". Available seeders: DatabaseSeeder, RolesAndPermissionsSeeder, UsersSeeder, FacilitiesAndStaffSeeder, SettingsSeeder`,
    );
  }

  return seederClass;
}

async function runSeeder(seederClass: SeederClass): Promise<void> {
  if (seederClass === 'RolesAndPermissionsSeeder') {
    await new RolesAndPermissionsSeeder(dataSource).run();
    return;
  }

  if (seederClass === 'UsersSeeder') {
    await new UsersSeeder(dataSource).run();
    return;
  }

  if (seederClass === 'SettingsSeeder') {
    await new SettingsSeeder(dataSource).run();
    return;
  }

  if (seederClass === 'FacilitiesAndStaffSeeder') {
    await new FacilitiesAndStaffSeeder(dataSource).run();
    return;
  }

  await new DatabaseSeeder(dataSource).run();
}

async function seed(): Promise<void> {
  await dataSource.initialize();

  const seederClass = resolveSeederClass();
  await runSeeder(seederClass);

  await dataSource.destroy();
  console.log(`${seederClass} completed successfully`);
}

seed().catch(async (error: unknown) => {
  console.error(error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
