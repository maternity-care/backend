import { AppointmentDisruptionItem } from './../modules/shifts/entities/appointment-disruption-item.entity';
import { StaffPermission } from './../modules/permissions/entities/staff-permission.entity';
import 'reflect-metadata';
import 'tsconfig-paths/register';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Appointment } from '../modules/appointments/entities/appointment.entity';
import { AppointmentServiceItem } from '../modules/appointments/entities/appointment-service-item.entity';
import { AppointmentReminder } from './entities/appointment-reminder.entity';
import { AppointmentStatusLog } from './entities/appointment-status-log.entity';
import { Article } from './entities/article.entity';
import { ContentReport } from './entities/content-report.entity';
import { Doctor } from '../modules/doctors/entities/doctor.entity';
import { DoctorShiftChangeLog } from '../modules/shifts/entities/doctor-shift-change-log.entity';
import { Facility } from '../modules/facilities/entities/facility.entity';
import { FacilityOperatingHour } from '../modules/facilities/entities/facility-operating-hour.entity';
import { FacilityService } from '../modules/facility-services/entities/facility-service.entity';
import { Faq } from './entities/faq.entity';
import { ForumCategoryMetadata } from './entities/forum-category-metadata.entity';
import { HealthMetric } from './entities/health-metric.entity';
import { Invoice } from '../modules/payment/entities/invoice.entity';
import { MaternityPackage } from '../modules/maternity-packages/entities/maternity-package.entity';
import { PackageStage } from '../modules/maternity-packages/entities/package-stage.entity';
import { MedicalFile } from './entities/medical-file.entity';
import { MedicalRecord } from '../modules/medical-records/entities/medical-record.entity';
import { Order } from '../modules/payment/entities/order.entity';
import { OrderItem } from '../modules/payment/entities/order-item.entity';
import { PackageItem } from '../modules/package-services/entities/package-item.entity';
import { PackageServiceFacility } from '../modules/package-services/entities/package-service-facility.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { PatientPackageBenefit } from './entities/patient-package-benefit.entity';
import { Payment } from '../modules/payment/entities/payment.entity';
import { Permission } from '../modules/permissions/entities/permission.entity';
import { PregnancyHistoryEvent } from './entities/pregnancy-history-event.entity';
import { PregnancyProfile } from '../modules/pregnancy-profile/entities/pregnancy-profile.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { Room } from '../modules/rooms/entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { Service } from '../modules/services/entities/service.entity';
import { ServiceType } from '../modules/service-types/entities/service-type.entity';
import { Setting } from '../modules/settings/entities/setting.entity';
import { Shift } from '../modules/shifts/entities/shift.entity';
import { ShiftDisruption } from '../modules/shifts/entities/shift-disruption.entity';
import { ShiftSlot } from './entities/shift-slot.entity';
import { Staff } from '../modules/staffs/entities/staff.entity';
import { StaffPasswordResetToken } from '../modules/auth/entities/staff-password-reset-token.entity';
import { StaffRefreshToken } from '../modules/auth/entities/staff-refresh-token.entity';
import { User } from '../modules/users/entities/user.entity';
import { UserAuth } from '../modules/auth/entities/user-auth.entity';
import { UserSchedule } from '../modules/schedules/entities/user-schedule.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { MessagingChannelAccount } from '../modules/messaging/entities/messaging-channel-account.entity';
import { MessagingConversationTag } from '../modules/messaging/entities/messaging-conversation-tag.entity';
import { MessagingConversation } from '../modules/messaging/entities/messaging-conversation.entity';
import { MessagingCustomerIdentity } from '../modules/messaging/entities/messaging-customer-identity.entity';
import { MessagingMessage } from '../modules/messaging/entities/messaging-message.entity';
import { MessagingTag } from '../modules/messaging/entities/messaging-tag.entity';
import { UpdateServicePackageDesign1785120000000 } from './migrations/1785120000000-UpdateServicePackageDesign';
import { UseDynamicServiceTypes1785200000000 } from './migrations/1785200000000-UseDynamicServiceTypes';
import { MakeFacilityLocationNullable1785300000000 } from './migrations/1785300000000-MakeFacilityLocationNullable';
import { AddPackageStages1785400000000 } from './migrations/1785400000000-AddPackageStages';
import { AddChatbotPersistence1785500000000 } from './migrations/1785500000000-AddChatbotPersistence';
import { AddChatbotGuestAndUploadRateLimit1785600000000 } from './migrations/1785600000000-AddChatbotGuestAndUploadRateLimit';
import { UseAppointmentTimestamps1785700000000 } from './migrations/1785700000000-UseAppointmentTimestamps';
import { MakeAppointmentPregnancyProfileNullable1785800000000 } from './migrations/1785800000000-MakeAppointmentPregnancyProfileNullable';
import { AddUserSchedules1785900000000 } from './migrations/1785900000000-AddUserSchedules';
import { BackfillAppointmentSchedules1786000000000 } from './migrations/1786000000000-BackfillAppointmentSchedules';
import { AddForumModeration1786100000000 } from './migrations/1786100000000-AddForumModeration';
import { AddForumCategories1786200000000 } from './migrations/1786200000000-AddForumCategories';
import { AddManagementModulePermissions1786300000000 } from './migrations/1786300000000-AddManagementModulePermissions';
import { AddFacilityRoomSuspendFields1786400000000 } from './migrations/1786400000000-AddFacilityRoomSuspendFields';
import { AssignDoctorPregnancyCreatePermission1786500000000 } from './migrations/1786500000000-AssignDoctorPregnancyCreatePermission';
import { AddForumNotifications1786600000000 } from './migrations/1786600000000-AddForumNotifications';
import { AddApplicableDaysToShiftSlots1786700000000 } from './migrations/1786700000000-AddApplicableDaysToShiftSlots';
import { DropFacilityClosureDays1786800000000 } from './migrations/1786800000000-DropFacilityClosureDays';
import { RebuildDatabaseTest1786726656690 } from './migrations/1786726656690-RebuildDatabaseTest';
import { AddMessagingModule1787100000000 } from './migrations/1787100000000-AddMessagingModule';
import { AddMessagingTags1787200000000 } from './migrations/1787200000000-AddMessagingTags';
import { AddMessagingCustomerIdentities1787300000000 } from './migrations/1787300000000-AddMessagingCustomerIdentities';
import { MigrateChatbotToMessaging1787400000000 } from './migrations/1787400000000-MigrateChatbotToMessaging';
import { AddAppointmentServiceItems1787500000000 } from './migrations/1787500000000-AddAppointmentServiceItems';
import { AddServiceDoctorSelection1787600000000 } from './migrations/1787600000000-AddServiceDoctorSelection';

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
  dateStrings: ['DATE'],
  entities: [
    User,
    Role,
    Permission,
    PasswordResetToken,
    RefreshToken,
    Setting,
    Staff,
    UserSchedule,
    StaffRefreshToken,
    StaffPasswordResetToken,
    Facility,
    FacilityOperatingHour,
    FacilityService,
    Doctor,
    Room,
    DoctorShiftChangeLog,
    Shift,
    ShiftDisruption,
    AppointmentDisruptionItem,
    Notification,
    Service,
    ServiceType,
    MaternityPackage,
    PackageStage,
    RoomType,
    UserAuth,
    Appointment,
    AppointmentServiceItem,
    AppointmentReminder,
    AppointmentStatusLog,
    Article,
    ContentReport,
    Faq,
    ForumCategoryMetadata,
    HealthMetric,
    Invoice,
    MedicalFile,
    MedicalRecord,
    Order,
    OrderItem,
    PackageItem,
    PackageServiceFacility,
    PatientPackageBenefit,
    Payment,
    PregnancyHistoryEvent,
    PregnancyProfile,
    ShiftSlot,
    StaffPermission,
    MessagingChannelAccount,
    MessagingConversation,
    MessagingConversationTag,
    MessagingCustomerIdentity,
    MessagingMessage,
    MessagingTag,
    join(__dirname, 'entities', '*.entity{.ts,.js}'),
  ],
  migrations: [
    // UpdateServicePackageDesign1785120000000,
    // UseDynamicServiceTypes1785200000000,
    // MakeFacilityLocationNullable1785300000000,
    // AddPackageStages1785400000000,
    // AddChatbotPersistence1785500000000,
    // AddChatbotGuestAndUploadRateLimit1785600000000,
    // UseAppointmentTimestamps1785700000000,
    // MakeAppointmentPregnancyProfileNullable1785800000000,
    // AddUserSchedules1785900000000,
    // BackfillAppointmentSchedules1786000000000,
    // AddForumModeration1786100000000,
    // AddForumCategories1786200000000,
    // AddManagementModulePermissions1786300000000,
    // AddFacilityRoomSuspendFields1786400000000,
    // AssignDoctorPregnancyCreatePermission1786500000000,
    // AddForumNotifications1786600000000,
    // AddApplicableDaysToShiftSlots1786700000000,
    // DropFacilityClosureDays1786800000000,
    RebuildDatabaseTest1786726656690,
    AddMessagingModule1787100000000,
    AddMessagingTags1787200000000,
    AddMessagingCustomerIdentities1787300000000,
    MigrateChatbotToMessaging1787400000000,
    AddAppointmentServiceItems1787500000000,
    AddServiceDoctorSelection1787600000000,
  ],
  charset: 'utf8mb4_unicode_ci',
};

export default new DataSource(typeOrmConfig);
