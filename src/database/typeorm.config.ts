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
import { StaffProfile } from '../modules/staffs/entities/staff-profiles.entity';
import { CreateRbacTables1710000000000 } from './migrations/1710000000000-CreateRbacTables';
import { CreateRefreshTokensTable1720000000000 } from './migrations/1720000000000-CreateRefreshTokensTable';
import { CreateSettingsTable1730000000000 } from './migrations/1730000000000-CreateSettingsTable';
import { CreateMaternityDomainTables1740000000000 } from './migrations/1740000000000-CreateMaternityDomainTables';
import { CreateUserPermissionsTable1740100000000 } from './migrations/1740100000000-CreateUserPermissionsTable';
import { AddSoftDeleteToRbacTables1750700000000 } from './migrations/1750700000000-AddSoftDeleteToRbacTables';
import { CreatePasswordResetTokensTable1750800000000 } from './migrations/1750800000000-CreatePasswordResetTokensTable';
import { MergeFacilityDoctorsIntoFacilityStaff1750900000000 } from './migrations/1750900000000-MergeFacilityDoctorsIntoFacilityStaff';
import { MoveOperationalRolesToFacilityStaff1751000000000 } from './migrations/1751000000000-MoveOperationalRolesToFacilityStaff';
import { SeparateUsersAndStaffs1751100000000 } from './migrations/1751100000000-SeparateUsersAndStaffs';
import { CreateStaffAuthTokens1751200000000 } from './migrations/1751200000000-CreateStaffAuthTokens';
import { RemoveStaffPosition1751300000000 } from './migrations/1751300000000-RemoveStaffPosition';
import { AllowMultipleFacilityStaffRoles1751400000000 } from './migrations/1751400000000-AllowMultipleFacilityStaffRoles';
import { ConvertStatusesToEnums1751500000000 } from './migrations/1751500000000-ConvertStatusesToEnums';
import { AddOperationalSoftDeleteAndDisruptions1751600000000 } from './migrations/1751600000000-AddOperationalSoftDeleteAndDisruptions';
import { UpdatePregnancyProfilesTable1751600000000 } from './migrations/1751600000000-UpdatePregnancyProfilesTable';
import { CreateNotificationsTable1760000000000 } from './migrations/1760000000000-CreateNotificationsTable';
import { StaffRefreshToken } from '../modules/auth/entities/staff-refresh-token.entity';
import { StaffPasswordResetToken } from '../modules/auth/entities/staff-password-reset-token.entity';
import { Facility } from '../modules/facilities/entities/facilities.entity';
import { FacilityStaff } from '../modules/facilities/entities/facility-staff.entity';
import { FacilityService } from '../modules/facility-services/entities/facility-services.entity';
import { Doctor } from '../modules/doctors/entities/doctors.entity';
import { Room } from '../modules/rooms/entities/rooms.entity';
import { DoctorShift } from '../modules/doctor-shifts/entities/doctor-shifts.entity';
import { DoctorShiftChangeLog } from '../modules/doctor-shifts/entities/doctor-shift-change-logs.entity';
import { ShiftDisruption } from '../modules/doctor-shifts/entities/shift-disruptions.entity';
import { AppointmentDisruptionItem } from '../modules/doctor-shifts/entities/appointment-disruption-items.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';

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
    StaffProfile,
    StaffRefreshToken,
    StaffPasswordResetToken,
    Facility,
    FacilityStaff,
    FacilityService,
    Doctor,
    Room,
    DoctorShift,
    DoctorShiftChangeLog,
    ShiftDisruption,
    AppointmentDisruptionItem,
    Notification,
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
    MergeFacilityDoctorsIntoFacilityStaff1750900000000,
    MoveOperationalRolesToFacilityStaff1751000000000,
    SeparateUsersAndStaffs1751100000000,
    CreateStaffAuthTokens1751200000000,
    RemoveStaffPosition1751300000000,
    AllowMultipleFacilityStaffRoles1751400000000,
    ConvertStatusesToEnums1751500000000,
    AddOperationalSoftDeleteAndDisruptions1751600000000,
    UpdatePregnancyProfilesTable1751600000000,
    CreateNotificationsTable1760000000000,
  ],
  charset: 'utf8mb4_unicode_ci',
};

export default new DataSource(typeOrmConfig);
