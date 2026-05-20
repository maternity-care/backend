import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import dataSource from '../typeorm.config';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

type SeederClass = 'DatabaseSeeder' | 'RolesAndPermissionsSeeder' | 'UsersSeeder';

interface SeedUser {
  name: string;
  email: string;
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
  { name: 'Super Administrator', email: 'superadmin@example.com', role: RoleEnum.SUPER_ADMIN },
  { name: 'Administrator', email: 'admin@example.com', role: RoleEnum.ADMIN },
  { name: 'Doctor Demo', email: 'doctor@example.com', role: RoleEnum.DOCTOR },
  { name: 'Nurse Demo', email: 'nurse@example.com', role: RoleEnum.NURSE },
  { name: 'Staff Demo', email: 'staff@example.com', role: RoleEnum.STAFF },
  { name: 'Member Demo', email: 'member@example.com', role: RoleEnum.MEMBER },
  { name: 'Partner Demo', email: 'partner@example.com', role: RoleEnum.PARTNER },
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
        existingUser.status = 1;
        existingUser.roles = [role];
        await userRepository.save(existingUser);
        continue;
      }

      const user = userRepository.create({
        name: seedUser.name,
        email: seedUser.email,
        password,
        status: 1,
        roles: [role],
      });
      await userRepository.save(user);
    }
  }
}

class DatabaseSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    await new RolesAndPermissionsSeeder(this.connection).run();
    await new UsersSeeder(this.connection).run();
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
  };

  const seederClass = aliases[requestedSeeder];

  if (!seederClass) {
    throw new Error(
      `Unknown seeder "${requestedSeeder}". Available seeders: DatabaseSeeder, RolesAndPermissionsSeeder, UsersSeeder`,
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
