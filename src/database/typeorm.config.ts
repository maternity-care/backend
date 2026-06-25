import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { Permission } from '../modules/permissions/entities/permission.entity';
import { UserPermission } from '../modules/permissions/entities/user-permission.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Setting } from '../modules/settings/entities/setting.entity';
import { CreateRbacTables1710000000000 } from './migrations/1710000000000-CreateRbacTables';
import { CreateRefreshTokensTable1720000000000 } from './migrations/1720000000000-CreateRefreshTokensTable';
import { CreateSettingsTable1730000000000 } from './migrations/1730000000000-CreateSettingsTable';
import { CreateMaternityDomainTables1740000000000 } from './migrations/1740000000000-CreateMaternityDomainTables';
import { CreateUserPermissionsTable1740100000000 } from './migrations/1740100000000-CreateUserPermissionsTable';
import { AddSoftDeleteToRbacTables1750700000000 } from './migrations/1750700000000-AddSoftDeleteToRbacTables';
import { CreatePasswordResetTokensTable1750800000000 } from './migrations/1750800000000-CreatePasswordResetTokensTable';

config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'mariadb',
  host: process.env.DB_HOST ?? 'maternity-mariadb',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? 'password',
  database: process.env.DB_DATABASE ?? 'maternity_care',
  synchronize: false,
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Role,
    Permission,
    UserPermission,
    PasswordResetToken,
    RefreshToken,
    Setting,
    join(__dirname, 'entities', '*.entity{.ts,.js}'),
  ],
  migrations: [
    CreateRbacTables1710000000000,
    CreateRefreshTokensTable1720000000000,
    CreateSettingsTable1730000000000,
    CreateMaternityDomainTables1740000000000,
    CreateUserPermissionsTable1740100000000,
    AddSoftDeleteToRbacTables1750700000000,
    CreatePasswordResetTokensTable1750800000000,
  ],
  charset: 'utf8mb4_unicode_ci',
};

export default new DataSource(typeOrmConfig);
