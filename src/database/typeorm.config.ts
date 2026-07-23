import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Appointment } from './entities/appointment.entity';
import { AppointmentReminder } from './entities/appointment-reminder.entity';
import { AppointmentStatusLog } from './entities/appointment-status-log.entity';
import { Article } from './entities/article.entity';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ContentReport } from './entities/content-report.entity';
import { Doctor } from '../modules/doctors/entities/doctor.entity';
import { DoctorShiftChangeLog } from '../modules/doctor-shifts/entities/doctor-shift-change-log.entity';
import { Facility } from '../modules/facilities/entities/facility.entity';
import { FacilityService } from '../modules/facility-services/entities/facility-service.entity';
import { Faq } from './entities/faq.entity';
import { HealthMetric } from './entities/health-metric.entity';
import { Invoice } from './entities/invoice.entity';
import { MaternityPackage } from '../modules/maternity-packages/entities/maternity-package.entity';
import { MedicalFile } from './entities/medical-file.entity';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicationTakenLog } from './entities/medication-taken-log.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PackageItem } from '../modules/package-services/entities/package-item.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { PatientPackageBenefit } from './entities/patient-package-benefit.entity';
import { Payment } from './entities/payment.entity';
import { Permission } from '../modules/permissions/entities/permission.entity';
import { PregnancyHistoryEvent } from './entities/pregnancy-history-event.entity';
import { PregnancyProfile } from '../modules/pregnancy-profile/entities/pregnancy-profile.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionHistory } from './entities/prescription-history.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Room } from '../modules/rooms/entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { Service } from '../modules/services/entities/service.entity';
import { Setting } from '../modules/settings/entities/setting.entity';
import { Shift } from '../modules/doctor-shifts/entities/shift.entity';
import { ShiftDisruption } from '../modules/doctor-shifts/entities/shift-disruption.entity';
import { ShiftSlot } from './entities/shift-slot.entity';
import { Staff } from '../modules/staffs/entities/staff.entity';
import { StaffPasswordResetToken } from '../modules/auth/entities/staff-password-reset-token.entity';
import { StaffRefreshToken } from '../modules/auth/entities/staff-refresh-token.entity';
import { StaffRole } from './entities/staff-role.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserAuth } from './entities/user-auth.entity';
// import { CreateRbacTables1710000000000 } from './migrations/1710000000000-CreateRbacTables';
// import { CreateRefreshTokensTable1720000000000 } from './migrations/1720000000000-CreateRefreshTokensTable';
// import { CreateSettingsTable1730000000000 } from './migrations/1730000000000-CreateSettingsTable';
// import { CreateMaternityDomainTables1740000000000 } from './migrations/1740000000000-CreateMaternityDomainTables';
// import { CreateUserPermissionsTable1740100000000 } from './migrations/1740100000000-CreateUserPermissionsTable';
// import { AddSoftDeleteToRbacTables1750700000000 } from './migrations/1750700000000-AddSoftDeleteToRbacTables';
// import { CreatePasswordResetTokensTable1750800000000 } from './migrations/1750800000000-CreatePasswordResetTokensTable';
// import { MergeFacilityDoctorsIntoFacilityStaff1750900000000 } from './migrations/1750900000000-MergeFacilityDoctorsIntoFacilityStaff';
// import { MoveOperationalRolesToFacilityStaff1751000000000 } from './migrations/1751000000000-MoveOperationalRolesToFacilityStaff';
// import { SeparateUsersAndStaffs1751100000000 } from './migrations/1751100000000-SeparateUsersAndStaffs';
// import { CreateStaffAuthTokens1751200000000 } from './migrations/1751200000000-CreateStaffAuthTokens';
// import { RemoveStaffPosition1751300000000 } from './migrations/1751300000000-RemoveStaffPosition';
// import { AllowMultipleFacilityStaffRoles1751400000000 } from './migrations/1751400000000-AllowMultipleFacilityStaffRoles';
// import { ConvertStatusesToEnums1751500000000 } from './migrations/1751500000000-ConvertStatusesToEnums';
// import { AddOperationalSoftDeleteAndDisruptions1751600000000 } from './migrations/1751600000000-AddOperationalSoftDeleteAndDisruptions';
// import { UpdatePregnancyProfilesTable1751600000000 } from './migrations/1751600000000-UpdatePregnancyProfilesTable';
// import { CreateNotificationsTable1760000000000 } from './migrations/1760000000000-CreateNotificationsTable';
import { AppointmentDisruptionItem } from '../modules/doctor-shifts/entities/appointment-disruption-item.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { UpdateArchitectureDatabase1784847183545 } from './migrations/1784847183545-UpdateArchitectureDatabase';

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
    PasswordResetToken,
    RefreshToken,
    Setting,
    Staff,
    StaffRefreshToken,
    StaffPasswordResetToken,
    Facility,
    FacilityService,
    Doctor,
    Room,
    DoctorShiftChangeLog,
    Shift,
    ShiftDisruption,
    AppointmentDisruptionItem,
    Notification,
    Service,
    MaternityPackage,
    RoomType,
    UserAuth,
    Appointment,
    AppointmentReminder,
    AppointmentStatusLog,
    Article,
    ChatConversation,
    ChatMessage,
    ContentReport,
    Faq,
    HealthMetric,
    Invoice,
    MedicalFile,
    MedicalRecord,
    MedicationTakenLog,
    Order,
    OrderItem,
    PackageItem,
    PatientPackageBenefit,
    Payment,
    PregnancyHistoryEvent,
    PregnancyProfile,
    Prescription,
    PrescriptionHistory,
    PrescriptionItem,
    RolePermission,
    StaffRole,
    ShiftSlot,
    join(__dirname, 'entities', '*.entity{.ts,.js}'),
  ],
  migrations: [
    // CreateRbacTables1710000000000,
    // CreateRefreshTokensTable1720000000000,
    // CreateSettingsTable1730000000000,
    // CreateMaternityDomainTables1740000000000,
    // CreateUserPermissionsTable1740100000000,
    // AddSoftDeleteToRbacTables1750700000000,
    // CreatePasswordResetTokensTable1750800000000,
    // MergeFacilityDoctorsIntoFacilityStaff1750900000000,
    // MoveOperationalRolesToFacilityStaff1751000000000,
    // SeparateUsersAndStaffs1751100000000,
    // CreateStaffAuthTokens1751200000000,
    // RemoveStaffPosition1751300000000,
    // AllowMultipleFacilityStaffRoles1751400000000,
    // ConvertStatusesToEnums1751500000000,
    // AddOperationalSoftDeleteAndDisruptions1751600000000,
    // UpdatePregnancyProfilesTable1751600000000,
    // CreateNotificationsTable1760000000000,
    UpdateArchitectureDatabase1784847183545,
  ],
  charset: 'utf8mb4_unicode_ci',
};

export default new DataSource(typeOrmConfig);
