import {
  buildCodePrefixFromName,
  buildNextCodeFromExisting,
} from 'src/common/helpers/code-generator.helper';
import { User } from './../../modules/users/entities/user.entity';
import { Room } from './../../modules/rooms/entities/room.entity';
import { RoomType } from './../entities/room-type.entity';
import { Facility } from './../../modules/facilities/entities/facility.entity';
import { Article } from './../entities/article.entity';
import { EMAIL_DOMAIN, UserStatusEnum } from './../../modules/users/users.enum';
import {
  AccountStatus,
  ActiveStatus,
  ArticleStatus,
  AppointmentStatus,
  DoctorShiftStatus,
  FaqStatusEnum,
  ForumContentStatus,
  MaternityPackageStatus,
  OrderStatus,
  PaymentStatus,
  PregnancyProfileStatus,
  RiskLevel,
  ReminderStatus,
} from './../../common/constants/status.enum';
import { Staff } from './../../modules/staffs/entities/staff.entity';
import { RoleEnum } from './../../common/constants/role.enum';
import { Permission } from './../../modules/permissions/entities/permission.entity';
import { PermissionEnum } from './../../common/constants/permission.enum';
import { Role } from './../../modules/roles/entities/role.entity';
import dataSource from '../typeorm.config';
import {
  Appointment,
  AppointmentReminder,
  Doctor,
  Faq,
  FacilityService,
  ForumCategoryMetadata,
  ForumComment,
  ForumPost,
  HealthMetric,
  MaternityPackage,
  MedicalRecord,
  Order,
  OrderItem,
  PackageItem,
  PatientPackageBenefit,
  Payment,
  PregnancyProfile,
  Service,
  Shift,
  ShiftSlot,
  UserAuth,
  MedicalFile,
} from '../entities';
import {
  MaternityPackageStageType,
  MaternityPackageType,
} from '../../modules/maternity-packages/dto/requests/create-maternity-package.dto';
import { PackageServiceFacilityScope } from '../../modules/package-services/dto/requests/create-package-service.dto';
import { ServiceSaleMode } from '../../modules/services/dto/requests/create-service.dto';
import { ForumAuthorRole, ForumCategory } from '../../common/constants/forum.enum';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../common/constants/notification.enum';
import { PackageServiceFacility } from '../../modules/package-services/entities/package-service-facility.entity';
import { PackageStage } from '../../modules/maternity-packages/entities/package-stage.entity';
import { OrderType } from '../../modules/payment/entities/order.entity';
import { OrderItemType } from '../../modules/payment/entities/order-item.entity';
import { ServiceType } from '../../modules/service-types/entities/service-type.entity';
import { Setting } from '../../modules/settings/entities/setting.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { UserSchedule } from '../../modules/schedules/entities/user-schedule.entity';
import * as bcrypt from 'bcrypt';
import { Not, In, DeepPartial } from 'typeorm';

// khởi tạo global repository
const roleRepository = dataSource.getRepository(Role);
const permissionRepository = dataSource.getRepository(Permission);
const staffRepository = dataSource.getRepository(Staff);
const doctorRepository = dataSource.getRepository(Doctor);
const faqRepository = dataSource.getRepository(Faq);
const articleRepository = dataSource.getRepository(Article);
const facilityRepository = dataSource.getRepository(Facility);
const roomTypeRepository = dataSource.getRepository(RoomType);
const roomRepository = dataSource.getRepository(Room);
const userRepository = dataSource.getRepository(User);
const pregnancyProfileRepository = dataSource.getRepository(PregnancyProfile);
const userAuthRepository = dataSource.getRepository(UserAuth);
const shiftSlotRepository = dataSource.getRepository(ShiftSlot);
const shiftRepository = dataSource.getRepository(Shift);
const serviceTypeRepository = dataSource.getRepository(ServiceType);
const serviceRepository = dataSource.getRepository(Service);
const facilityServiceRepository = dataSource.getRepository(FacilityService);
const maternityPackageRepository = dataSource.getRepository(MaternityPackage);
const packageStageRepository = dataSource.getRepository(PackageStage);
const packageItemRepository = dataSource.getRepository(PackageItem);
const packageServiceFacilityRepository = dataSource.getRepository(PackageServiceFacility);
const appointmentRepository = dataSource.getRepository(Appointment);
const appointmentReminderRepository = dataSource.getRepository(AppointmentReminder);
const orderRepository = dataSource.getRepository(Order);
const orderItemRepository = dataSource.getRepository(OrderItem);
const paymentRepository = dataSource.getRepository(Payment);
const patientPackageBenefitRepository = dataSource.getRepository(PatientPackageBenefit);
const healthMetricRepository = dataSource.getRepository(HealthMetric);
const medicalRecordRepository = dataSource.getRepository(MedicalRecord);
const forumCategoryRepository = dataSource.getRepository(ForumCategoryMetadata);
const forumPostRepository = dataSource.getRepository(ForumPost);
const forumCommentRepository = dataSource.getRepository(ForumComment);
const settingRepository = dataSource.getRepository(Setting);
const scheduleRepository = dataSource.getRepository(UserSchedule);
const notificationRepository = dataSource.getRepository(Notification);
const medicalFileRepository = dataSource.getRepository(MedicalFile);

//---------------------------------

const shouldFreshSeed = process.argv.includes('--fresh') || process.env.SEED_FRESH === 'true';

const toLoginEmailLocalPart = (value: string): string => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const seedTables = [
  'appointment_disruption_items',
  'shift_disruptions',
  'shift_change_logs',
  'appointment_reminders',
  'appointment_statu_logs',
  'medical_files',
  'medical_records',
  'health_metrics',
  'pregnancy_history_events',
  'payments',
  'invoices',
  'order_items',
  'orders',
  'patient_package_benefits',
  'appointments',
  'package_service_facilities',
  'package_items',
  'package_stages',
  'maternity_packages',
  'facility_services',
  'services',
  'service_types',
  'shifts',
  'shift_slots',
  'rooms',
  'room_types',
  'facility_operating_hours',
  'facility_staff',
  'facilities',
  'doctors',
  'articles',
  'faqs',
  'forum_moderation_logs',
  'content_reports',
  'forum_comments',
  'forum_posts',
  'forum_categories',
  'forum_topics',
  'chat_messages',
  'chat_conversations',
  'notifications',
  'user_schedules',
  'user_auths',
  'refresh_tokens',
  'password_reset_tokens',
  'staff_refresh_tokens',
  'staff_password_reset_tokens',
  'staff_permissions',
  'staff_roles',
  'staffs',
  'pregnancy_profiles',
  'users',
  'role_permissions',
  'permissions',
  'roles',
  'settings',
];

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await dataSource.query(
    `
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?
    `,
    [tableName],
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

async function clearSeedData(): Promise<void> {
  console.log('Đang clear dữ liệu seed...');
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    for (const tableName of seedTables) {
      if (await tableExists(tableName)) {
        await dataSource.query(`TRUNCATE TABLE \`${tableName}\``);
      }
    }
  } finally {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

// Hàm insert data cho các bảng
async function insertPermission() {
  const data = Object.values(PermissionEnum).map((permission) => {
    return {
      name: permission,
      guardName: 'api',
    };
  });

  await permissionRepository.save(data);
}

async function insertRoles() {
  const roles = Object.values(RoleEnum).map((role) => {
    return {
      name: role,
      guardName: 'api',
    };
  });
  await roleRepository.save(roles);
}

async function insertRolePermission() {
  const roles = await roleRepository.find();
  const permissions = await permissionRepository.find();
  const rolePermissionMap: Record<RoleEnum, PermissionEnum[]> = {
    [RoleEnum.SUPER_ADMIN]: Object.values(PermissionEnum),
    [RoleEnum.ADMIN]: Object.values(PermissionEnum),
    [RoleEnum.DOCTOR]: [
      PermissionEnum.MEMBER_VIEW,
      PermissionEnum.MEMBER_MEDICAL_VIEW,
      PermissionEnum.PREGNANCY_VIEW,
      PermissionEnum.PREGNANCY_CREATE,
      PermissionEnum.PREGNANCY_UPDATE,
      PermissionEnum.HEALTH_METRIC_VIEW,
      PermissionEnum.HEALTH_METRIC_CREATE,
      PermissionEnum.HEALTH_METRIC_UPDATE,
      PermissionEnum.APPOINTMENT_VIEW,
      PermissionEnum.APPOINTMENT_UPDATE,
      PermissionEnum.FACILITY_VIEW,
      PermissionEnum.ROOM_VIEW,
      PermissionEnum.ROOM_TYPE_VIEW,
      PermissionEnum.SHIFT_VIEW,
      PermissionEnum.SHIFT_SLOT_VIEW,
      PermissionEnum.SERVICE_VIEW,
      PermissionEnum.SERVICE_PACKAGE_VIEW,
      PermissionEnum.MEDICAL_RECORD_VIEW,
      PermissionEnum.MEDICAL_RECORD_CREATE,
      PermissionEnum.MEDICAL_RECORD_UPDATE,
      PermissionEnum.MEDICAL_RECORD_SENSITIVE_VIEW,
      PermissionEnum.REMINDER_VIEW,
      PermissionEnum.CHECKLIST_VIEW,
      PermissionEnum.CONSULTATION_VIEW,
      PermissionEnum.CONSULTATION_REPLY,
      PermissionEnum.FORUM_VIEW,
      PermissionEnum.FORUM_CREATE,
    ],
    [RoleEnum.NURSE]: [
      PermissionEnum.MEMBER_VIEW,
      PermissionEnum.PREGNANCY_VIEW,
      PermissionEnum.PREGNANCY_CREATE,
      PermissionEnum.HEALTH_METRIC_VIEW,
      PermissionEnum.HEALTH_METRIC_CREATE,
      PermissionEnum.HEALTH_METRIC_UPDATE,
      PermissionEnum.APPOINTMENT_VIEW,
      PermissionEnum.APPOINTMENT_UPDATE,
      PermissionEnum.FACILITY_VIEW,
      PermissionEnum.ROOM_VIEW,
      PermissionEnum.ROOM_TYPE_VIEW,
      PermissionEnum.SHIFT_VIEW,
      PermissionEnum.SHIFT_SLOT_VIEW,
      PermissionEnum.SERVICE_VIEW,
      PermissionEnum.SERVICE_PACKAGE_VIEW,
      PermissionEnum.REMINDER_VIEW,
      PermissionEnum.REMINDER_CREATE,
      PermissionEnum.REMINDER_UPDATE,
      PermissionEnum.CHECKLIST_VIEW,
      PermissionEnum.CHECKLIST_UPDATE,
      PermissionEnum.CONSULTATION_VIEW,
      PermissionEnum.CONSULTATION_REPLY,
      PermissionEnum.FORUM_VIEW,
      PermissionEnum.FORUM_CREATE,
    ],
    [RoleEnum.STAFF]: [
      PermissionEnum.MEMBER_VIEW,
      PermissionEnum.PREGNANCY_VIEW,
      PermissionEnum.PREGNANCY_CREATE,
      PermissionEnum.APPOINTMENT_VIEW,
      PermissionEnum.APPOINTMENT_CREATE,
      PermissionEnum.APPOINTMENT_UPDATE,
      PermissionEnum.APPOINTMENT_CANCEL,
      PermissionEnum.FACILITY_VIEW,
      PermissionEnum.ROOM_VIEW,
      PermissionEnum.ROOM_TYPE_VIEW,
      PermissionEnum.SHIFT_VIEW,
      PermissionEnum.SHIFT_SLOT_VIEW,
      PermissionEnum.SERVICE_VIEW,
      PermissionEnum.CONSULTATION_VIEW,
      PermissionEnum.CONSULTATION_REPLY,
      PermissionEnum.CONSULTATION_CLOSE,
      PermissionEnum.SERVICE_PACKAGE_VIEW,
      PermissionEnum.PAYMENT_VIEW,
      PermissionEnum.ARTICLE_VIEW,
      PermissionEnum.FORUM_VIEW,
      PermissionEnum.FORUM_CREATE,
      PermissionEnum.FORUM_UPDATE,
      PermissionEnum.FORUM_DELETE,
      PermissionEnum.FORUM_MODERATE,
      PermissionEnum.FORUM_REPORT_VIEW,
      PermissionEnum.FORUM_REPORT_RESOLVE,
    ],
    [RoleEnum.MODERATOR]: [
      PermissionEnum.FORUM_VIEW,
      PermissionEnum.FORUM_CREATE,
      PermissionEnum.FORUM_UPDATE,
      PermissionEnum.FORUM_DELETE,
      PermissionEnum.FORUM_MODERATE,
      PermissionEnum.FORUM_REPORT_VIEW,
      PermissionEnum.FORUM_REPORT_RESOLVE,
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
      PermissionEnum.FORUM_VIEW,
      PermissionEnum.FORUM_CREATE,
    ],
    [RoleEnum.PARTNER]: [
      PermissionEnum.PREGNANCY_VIEW,
      PermissionEnum.HEALTH_METRIC_VIEW,
      PermissionEnum.APPOINTMENT_VIEW,
      PermissionEnum.MEDICAL_RECORD_VIEW,
      PermissionEnum.REMINDER_VIEW,
      PermissionEnum.CHECKLIST_VIEW,
      PermissionEnum.ARTICLE_VIEW,
      PermissionEnum.FORUM_VIEW,
    ],
  };
  const data = roles
    .map((role) => {
      const roleId = role.id;
      const permissionNames = rolePermissionMap[role.name as RoleEnum];
      const rolePermissions = permissionNames.map((permissionName) => {
        return {
          roleId,
          permissionId: permissions.find((permission) => permission.name === permissionName)?.id,
        };
      });
      return rolePermissions;
    })
    .flat();

  if (data.length > 0) {
    await dataSource
      .createQueryBuilder()
      .insert()
      .into('role_permissions')
      .values(
        data
          .filter((item) => item.permissionId)
          .map((item) => ({
            role_id: item.roleId,
            permission_id: item.permissionId,
          })),
      )
      .execute();
  }
}

async function insertRoomTypes() {
  const roomTypes = [
    {
      name: 'Phòng lễ tân',
      description:
        'Khu vực tiếp đón người bệnh, kiểm tra thông tin lịch hẹn, hướng dẫn thủ tục và thực hiện check-in.',
    },
    {
      name: 'Phòng chờ',
      description:
        'Khu vực dành cho người bệnh và người nhà chờ đến lượt khám hoặc sử dụng dịch vụ.',
    },
    {
      name: 'Phòng tư vấn',
      description:
        'Phòng dành cho bác sĩ hoặc nhân viên y tế tư vấn sức khỏe và hướng dẫn chăm sóc thai kỳ.',
    },
    {
      name: 'Phòng khám sản',
      description:
        'Phòng thực hiện thăm khám sản khoa, đánh giá tình trạng sức khỏe của mẹ và quá trình phát triển của thai nhi.',
    },
    {
      name: 'Phòng khám tổng quát',
      description:
        'Phòng thực hiện khám sức khỏe tổng quát và đánh giá các chỉ số sức khỏe cơ bản.',
    },
    {
      name: 'Phòng siêu âm',
      description:
        'Phòng được trang bị thiết bị phục vụ việc siêu âm và theo dõi sự phát triển của thai nhi.',
    },
    {
      name: 'Phòng lấy mẫu xét nghiệm',
      description: 'Phòng tiếp nhận và lấy các loại mẫu xét nghiệm theo chỉ định của bác sĩ.',
    },
    {
      name: 'Phòng xét nghiệm',
      description:
        'Khu vực thực hiện phân tích mẫu và xử lý các kết quả xét nghiệm phục vụ hoạt động khám chữa bệnh.',
    },
    {
      name: 'Phòng thủ thuật',
      description: 'Phòng thực hiện các thủ thuật y tế phù hợp với phạm vi chuyên môn của cơ sở.',
    },
    {
      name: 'Phòng điều dưỡng',
      description: 'Phòng làm việc của điều dưỡng, phục vụ theo dõi và hỗ trợ chăm sóc người bệnh.',
    },
    {
      name: 'Phòng làm việc bác sĩ',
      description:
        'Phòng làm việc chuyên môn, kiểm tra hồ sơ và trao đổi nghiệp vụ dành cho bác sĩ.',
    },
    {
      name: 'Phòng làm việc nhân viên',
      description: 'Phòng làm việc dành cho nhân viên hành chính và nhân viên vận hành của cơ sở.',
    },
    {
      name: 'Phòng quản lý',
      description: 'Phòng làm việc dành cho quản lý cơ sở và xử lý các công việc điều hành.',
    },
    {
      name: 'Phòng họp',
      description:
        'Phòng tổ chức họp, trao đổi chuyên môn, đào tạo và điều phối hoạt động của nhân viên.',
    },
    {
      name: 'Phòng lưu trữ hồ sơ',
      description: 'Khu vực quản lý và lưu trữ hồ sơ, tài liệu chuyên môn của cơ sở.',
    },
    {
      name: 'Kho vật tư y tế',
      description:
        'Khu vực lưu trữ dụng cụ, vật tư và thiết bị phục vụ hoạt động chuyên môn của cơ sở.',
    },
    {
      name: 'Phòng cấp phát thuốc',
      description: 'Khu vực tiếp nhận đơn và cấp phát thuốc theo quy định và chỉ định chuyên môn.',
    },
    {
      name: 'Quầy thanh toán',
      description:
        'Khu vực tiếp nhận thanh toán, xử lý hóa đơn và hướng dẫn các vấn đề liên quan đến chi phí dịch vụ.',
    },
    {
      name: 'Phòng nghỉ nhân viên',
      description: 'Phòng nghỉ giữa ca dành cho bác sĩ, điều dưỡng và các nhân viên của cơ sở.',
    },
    {
      name: 'Phòng kỹ thuật và giám sát',
      description:
        'Phòng dành cho thiết bị công nghệ, hệ thống giám sát và hoạt động hỗ trợ kỹ thuật.',
    },
  ];

  const getNextSequence = (existingCodes: string[], prefix: string, padding: number) => {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}[-_](\\d+)$`);
    const maxSequence = existingCodes.reduce((max, code) => {
      if (code === prefix) return Math.max(max, 1);
      const match = code.match(pattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return maxSequence + 1;
  };

  const buildCodePrefixFromName = (name: string) => {
    const normalized = String(name)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    return normalized ? normalized.split(' ').join('_').slice(0, 40) : 'ROOM_TYPE';
  };

  const generateRoomTypeCode = async (name: string) => {
    const prefix = buildCodePrefixFromName(name);
    const rows = await roomTypeRepository
      .createQueryBuilder('roomType')
      .withDeleted()
      .select('roomType.code', 'code')
      .where('roomType.code LIKE :pattern', { pattern: `${prefix}%` })
      .getRawMany<{ code: string }>();

    const existingCodes = rows.map((row) => row.code);
    const nextSequence = getNextSequence(existingCodes, prefix, 2);

    return nextSequence === 1 && !existingCodes.includes(prefix)
      ? prefix
      : `${prefix}_${String(nextSequence).padStart(2, '0')}`;
  };

  const savedRoomType: RoomType[] = [];

  for (const roomType of roomTypes) {
    const item = {
      ...roomType,
      code: await generateRoomTypeCode(roomType.name),
      status: ActiveStatus.ACTIVE,
    };
    const saved = await roomTypeRepository.save(item);
    savedRoomType.push(saved);
  }
}

async function insertStaffs() {
  const dbRoles = await roleRepository.find();
  const hashPassword = await bcrypt.hash('Password@123', 10);

  const getPositionCodePrefix = (role: RoleEnum) => {
    if (role === RoleEnum.SUPER_ADMIN) return 'SA';
    if (role === RoleEnum.ADMIN) return 'AD';
    if (role === RoleEnum.DOCTOR) return 'DR';
    if (role === RoleEnum.NURSE) return 'NU';
    return 'ST';
  };

  const generateStaffEmployeeCode = async () => {
    const year = new Date().getFullYear().toString().slice(-2); // Lấy 2 chữ số cuối của năm hiện tại
    const result = await staffRepository.query(
      `
  SELECT COALESCE(
    MAX(
      CAST(
        RIGHT(employee_code, 4)
        AS UNSIGNED
      )
    ),
    0
  ) AS max_number
  FROM staffs
  WHERE employee_code LIKE ?
  `,
      [`__${year}%`],
    );

    // tạo string nextNumber với 4 chữ số, ví dụ: 0001, 0002, 0003, ...
    const nextNumber = (Number(result[0].max_number) + 1).toString().padStart(4, '0');
    return `${year}${nextNumber}`;
  };

  const buildEmailPrefixFromName = (name: string) => {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, ' ')
      .trim()
      .toLowerCase();

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Tên người dùng không hợp lệ. Tên phải chứa ít nhất một ký tự chữ cái.');
    }

    const lastPart = parts[parts.length - 1];
    const prefixParts = parts.slice(0, -1);
    const initials = prefixParts.map((part) => part[0]).join('');

    return `${lastPart}${initials}`.replace(/[^a-z0-9]/g, '');
  };

  const companyEmail = async (name: string) => {
    const basePrefix = buildEmailPrefixFromName(name);

    const result = await staffRepository.query(
      `
      SELECT COALESCE(
        MAX(
          CAST(
            REPLACE(
              SUBSTRING_INDEX(email, '@', 1),
              ?,
              ''
            ) AS UNSIGNED
          )
        ),
        0
      ) AS max_number
      FROM staffs
      WHERE email REGEXP ?
      `,
      [basePrefix, `^${basePrefix}[0-9]+@${EMAIL_DOMAIN.replace(/\./g, '\\.')}$`],
    );

    const nextNumber = Number(result[0].max_number) + 1;

    return `${basePrefix}${nextNumber}@${EMAIL_DOMAIN}`;
  };

  const names = [
    'Nguyễn Minh Anh',
    'Trần Quốc Bảo',
    'Lê Hoàng Nam',
    'Phạm Thu Trang',
    'Hoàng Ngọc Mai',
    'Vũ Đức Anh',
    'Đặng Hải Yến',
    'Bùi Quang Huy',
    'Đỗ Khánh Linh',
    'Hồ Tuấn Kiệt',
    'Nguyễn Thị Lan Anh',
    'Trần Văn Minh',
    'Lê Phương Thảo',
    'Phạm Đức Long',
    'Hoàng Thanh Hương',
    'Vũ Minh Quân',
    'Đặng Ngọc Hà',
    'Bùi Thành Công',
    'Đỗ Mai Phương',
    'Hồ Quốc Khánh',
    'Nguyễn Nhật Linh',
    'Trần Anh Tuấn',
    'Lê Thu Huyền',
    'Phạm Minh Đức',
    'Hoàng Bảo Ngọc',
    'Vũ Quang Vinh',
    'Đặng Thùy Dương',
    'Bùi Gia Hưng',
    'Đỗ Ngọc Anh',
    'Hồ Đức Thành',
    'Nguyễn Quốc Việt',
    'Trần Minh Châu',
    'Lê Anh Khoa',
    'Phạm Ngọc Trâm',
    'Hoàng Tuấn Anh',
    'Vũ Thu Hà',
    'Đặng Minh Hiếu',
    'Bùi Thanh Tâm',
    'Đỗ Hải Đăng',
    'Hồ Phương Linh',
    'Nguyễn Đức Mạnh',
    'Trần Khánh Vy',
    'Lê Quốc Trung',
    'Phạm Thanh Nhàn',
    'Hoàng Minh Tú',
    'Vũ Ngọc Diệp',
    'Đặng Quang Dũng',
    'Bùi Thị Hạnh',
    'Đỗ Minh Hoàng',
    'Hồ Anh Thư',
    'Nguyễn Thành Đạt',
    'Trần Ngọc Ánh',
    'Lê Minh Nhật',
    'Phạm Thu Uyên',
    'Hoàng Quốc Huy',
    'Vũ Kim Ngân',
    'Đặng Đức Thắng',
    'Bùi Minh Trang',
    'Đỗ Thành Nam',
    'Hồ Ngọc Mai',
    'Nguyễn Quang Anh',
    'Trần Thu Giang',
    'Lê Đức Duy',
    'Phạm Khánh Hòa',
    'Hoàng Minh Phúc',
    'Vũ Hải Anh',
    'Đặng Tuấn Vũ',
    'Bùi Ngọc Linh',
    'Đỗ Quốc Cường',
    'Hồ Thanh Nga',
    'Nguyễn Tiến Dũng',
    'Trần Mai Anh',
    'Lê Hoàng Sơn',
    'Phạm Ngọc Hân',
    'Hoàng Đức Tài',
    'Vũ Phương Anh',
    'Đặng Minh Khang',
    'Bùi Thùy Linh',
    'Đỗ Anh Dũng',
    'Hồ Minh Nguyệt',
    'Nguyễn Thanh Bình',
    'Trần Bảo Châu',
    'Lê Quang Khải',
    'Phạm Minh Hằng',
    'Hoàng Gia Bảo',
    'Vũ Thanh Thủy',
    'Đặng Quốc Đạt',
    'Bùi Ngọc Minh',
    'Đỗ Thu Trang',
    'Hồ Anh Quân',
    'Nguyễn Trọng Nghĩa',
    'Trần Khánh An',
    'Lê Đức Phương',
    'Phạm Hải Yến',
    'Hoàng Minh Thành',
    'Vũ Ngọc Huyền',
    'Đặng Thành Trung',
    'Bùi Mai Linh',
    'Đỗ Quang Hưng',
    'Hồ Thanh Trúc',
    'Nguyễn Đức Khôi',
    'Trần Phương Mai',
    'Lê Thành Công',
    'Phạm Ngọc Quỳnh',
    'Hoàng Quốc Thịnh',
    'Vũ Thanh Mai',
    'Đặng Anh Khoa',
    'Bùi Minh Ngọc',
    'Đỗ Tuấn Thành',
    'Hồ Thu Phương',
  ];

  const addresses = [
    'Cầu Giấy, Hà Nội',
    'Đống Đa, Hà Nội',
    'Ba Đình, Hà Nội',
    'Hai Bà Trưng, Hà Nội',
    'Hoàn Kiếm, Hà Nội',
    'Thanh Xuân, Hà Nội',
    'Hoàng Mai, Hà Nội',
    'Long Biên, Hà Nội',
    'Nam Từ Liêm, Hà Nội',
    'Bắc Từ Liêm, Hà Nội',
    'Hà Đông, Hà Nội',
    'Tây Hồ, Hà Nội',
    'Gia Lâm, Hà Nội',
    'Đông Anh, Hà Nội',
    'Thanh Trì, Hà Nội',
    'Hoài Đức, Hà Nội',
    'Đan Phượng, Hà Nội',
    'Thạch Thất, Hà Nội',
    'Quốc Oai, Hà Nội',
    'Chương Mỹ, Hà Nội',
    'Sóc Sơn, Hà Nội',
    'Mê Linh, Hà Nội',
  ];

  const roleQuantities: Array<{
    role: RoleEnum;
    quantity: number;
  }> = [
    { role: RoleEnum.SUPER_ADMIN, quantity: 5 },
    { role: RoleEnum.ADMIN, quantity: 5 },
    { role: RoleEnum.DOCTOR, quantity: 60 },
    { role: RoleEnum.NURSE, quantity: 20 },
    { role: RoleEnum.STAFF, quantity: 20 },
  ];

  const removeVietnameseTones = (value: string): string => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const generateEmail = (name: string, index: number): string => {
    const nameParts = removeVietnameseTones(name).toLowerCase().trim().split(/\s+/);

    const lastName = nameParts[nameParts.length - 1];
    const initials = nameParts
      .slice(0, -1)
      .map((part) => part.charAt(0))
      .join('');

    return `${lastName}${initials}${String(index + 1).padStart(3, '0')}@gmail.com`;
  };

  const roles = roleQuantities.flatMap(({ role, quantity }) =>
    Array<RoleEnum>(quantity).fill(role),
  );
  const roleCounters = new Map<RoleEnum, number>();

  const baseData = names.map((name, index) => {
    const roleName = roles[index];
    const roleSequence = (roleCounters.get(roleName) ?? 0) + 1;
    roleCounters.set(roleName, roleSequence);

    return {
      name: roleName === RoleEnum.SUPER_ADMIN && roleSequence === 1 ? 'Super Admin' : name,
      personalEmail: generateEmail(name, index),
      loginEmail:
        roleName === RoleEnum.SUPER_ADMIN && roleSequence === 1
          ? `superadmin@${EMAIL_DOMAIN}`
          : undefined,
      // Tạo các số điện thoại mẫu từ 0985000001 đến 0985000110
      phoneNumber: `0985${String(index + 1).padStart(6, '0')}`,
      address: addresses[index % addresses.length],
      role: dbRoles.filter((role) => role.name === roleName) || [dbRoles[dbRoles.length - 1]],
    };
  });

  for (const staff of baseData) {
    const email = staff.loginEmail ?? (await companyEmail(staff.name));
    const employeeCode = `${getPositionCodePrefix(staff.role[0].name as RoleEnum)}${await generateStaffEmployeeCode()}`;
    const data = {
      name: staff.name,
      personalEmail: staff.personalEmail,
      employeeCode: employeeCode,
      email: email,
      avatar: 'https://hthaostudio.com/wp-content/uploads/2022/03/Anh-bac-si-nam-7-min.jpg.webp',
      phone: staff.phoneNumber,
      password: hashPassword,
      address: staff.address,
      status: AccountStatus.ACTIVE,
      permission: [],
      roles: staff.role,
    };
    await staffRepository.save(data);
  }
}

async function insertDoctor() {
  const staffs = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.DOCTOR } },
  });

  const roomTypes = await roomTypeRepository.find();
  const needDoctorRooms = [
    'Phòng khám sản',
    'Phòng khám tổng quát',
    'Phòng siêu âm',
    'Phòng xét nghiệm',
    'Phòng thủ thuật',
  ];

  const roomTypeIds = roomTypes
    .filter((roomType) => needDoctorRooms.includes(roomType.name))
    .map((roomType) => roomType.id);

  const titleList = [
    { title: 'Bác sĩ', year: 1 },
    { title: 'Bác sĩ Chuyên khoa I', year: 2 },
    { title: 'Bác sĩ Chuyên khoa II', year: 2 },
    { title: 'Thạc sĩ, Bác sĩ', year: 3 },
    { title: 'Tiến sĩ, Bác sĩ', year: 3 },
    { title: 'Phó giáo sư, Tiến sĩ, Bác sĩ', year: 4 },
    { title: 'Giáo sư, Tiến sĩ, Bác sĩ', year: 4 },
  ];

  const doctors = staffs.map((staff, index) => {
    const indexRandom = Math.floor(Math.random() * titleList.length);
    const title = titleList[indexRandom];
    const yearEx: Record<number, string> = {
      1: 'hơn 3 năm',
      2: 'hơn 8 năm',
      3: 'hơn 15 năm',
      4: 'hơn 25 năm',
    };
    return {
      staffId: staff.id,
      licenseNo: `CCHN-OBGYN-2601${index + 10}`,
      title: title.title,
      specialty: 'Sản phụ khoa',
      workingRoomTypeId: roomTypeIds[index % roomTypeIds.length],
      yearsOfExperience: title.year,
      bio: `${title.title} ${staff.name} có ${yearEx[Number(title.year)]} kinh nghiệm trong lĩnh vực sản phụ khoa, tận tâm tư vấn, thăm khám và đồng hành cùng mẹ bầu trong suốt thai kỳ, hướng đến sự an toàn và chăm sóc phù hợp cho mẹ và bé.`,
      status: ActiveStatus.ACTIVE,
      createdAt: new Date(new Date().getTime() - 5 * 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(new Date().getTime() - 5 * 365 * 24 * 60 * 60 * 1000),
    };
  });

  await doctorRepository.save(doctors);
}

async function insertFaqs() {
  const faqData = [
    {
      question: 'Làm thế nào để đăng ký tài khoản trên hệ thống?',
      answer:
        'Bạn chọn mục Đăng ký, nhập đầy đủ thông tin cá nhân, số điện thoại, email và mật khẩu, sau đó thực hiện xác minh theo hướng dẫn của hệ thống.',
      category: 'account',
    },
    {
      question: 'Tôi quên mật khẩu thì phải làm thế nào?',
      answer:
        'Bạn chọn Quên mật khẩu tại trang đăng nhập, nhập email đã đăng ký và làm theo hướng dẫn được gửi đến email để thiết lập mật khẩu mới.',
      category: 'account',
    },
    {
      question: 'Tôi có thể cập nhật thông tin cá nhân không?',
      answer:
        'Bạn có thể cập nhật các thông tin được phép tại mục Hồ sơ cá nhân. Một số thông tin quan trọng có thể yêu cầu xác minh hoặc hỗ trợ từ nhân viên.',
      category: 'account',
    },
    {
      question: 'Hồ sơ thai sản dùng để làm gì?',
      answer:
        'Hồ sơ thai sản lưu trữ thông tin thai kỳ, lịch sử khám, kết quả kiểm tra và các dữ liệu liên quan, giúp người dùng và bác sĩ theo dõi thai kỳ thuận tiện hơn.',
      category: 'pregnancy_profile',
    },
    {
      question: 'Tôi có thể tạo nhiều hồ sơ thai sản không?',
      answer:
        'Bạn có thể tạo hồ sơ cho các thai kỳ khác nhau. Tuy nhiên, thông thường tại một thời điểm chỉ nên có một hồ sơ thai kỳ đang hoạt động.',
      category: 'pregnancy_profile',
    },
    {
      question: 'Làm thế nào để đặt lịch khám?',
      answer:
        'Bạn chọn cơ sở, dịch vụ, bác sĩ và khung giờ còn trống, sau đó kiểm tra thông tin và xác nhận lịch hẹn.',
      category: 'appointment',
    },
    {
      question: 'Tôi có thể thay đổi lịch hẹn đã đặt không?',
      answer:
        'Bạn có thể yêu cầu đổi lịch nếu lịch hẹn đáp ứng chính sách thay đổi của cơ sở. Khung giờ mới phải còn khả dụng tại thời điểm xác nhận.',
      category: 'appointment',
    },
    {
      question: 'Làm thế nào để hủy lịch hẹn?',
      answer:
        'Bạn mở chi tiết lịch hẹn, chọn Hủy lịch và cung cấp lý do. Việc hoàn phí, nếu có, được thực hiện theo chính sách của cơ sở.',
      category: 'appointment',
    },
    {
      question: 'Tôi nên đến trước giờ khám bao lâu?',
      answer:
        'Bạn nên đến trước giờ hẹn khoảng 15 đến 30 phút để thực hiện thủ tục tiếp nhận và chuẩn bị các giấy tờ cần thiết.',
      category: 'appointment',
    },
    {
      question: 'Tôi cần mang theo những gì khi đến khám?',
      answer:
        'Bạn nên mang giấy tờ tùy thân, thông tin lịch hẹn, hồ sơ hoặc kết quả khám trước đây và các giấy tờ khác theo hướng dẫn của cơ sở.',
      category: 'appointment',
    },
    {
      question: 'Gói thai sản bao gồm những dịch vụ nào?',
      answer:
        'Mỗi gói có danh sách dịch vụ, số lần sử dụng, thời hạn và điều kiện áp dụng khác nhau. Bạn có thể xem chi tiết tại trang thông tin của từng gói.',
      category: 'package',
    },
    {
      question: 'Tôi có thể mua thêm dịch vụ ngoài gói không?',
      answer:
        'Bạn có thể chọn thêm các dịch vụ ngoài phạm vi của gói nếu dịch vụ đang được cung cấp tại cơ sở và đáp ứng điều kiện sử dụng.',
      category: 'package',
    },
    {
      question: 'Gói thai sản có thể sử dụng tại tất cả cơ sở không?',
      answer:
        'Phạm vi sử dụng phụ thuộc vào chính sách của từng gói. Một số gói áp dụng tại nhiều cơ sở, trong khi một số khác chỉ áp dụng tại cơ sở đã đăng ký.',
      category: 'package',
    },
    {
      question: 'Làm thế nào để xem số quyền lợi còn lại trong gói?',
      answer:
        'Bạn truy cập mục Gói của tôi để xem các dịch vụ được bao gồm, số lượt đã sử dụng, số lượt còn lại và thời hạn của gói.',
      category: 'package',
    },
    {
      question: 'Tôi có thể xem kết quả khám ở đâu?',
      answer:
        'Sau khi kết quả được cập nhật, bạn có thể xem tại mục Hồ sơ thai sản hoặc Lịch sử khám. Hệ thống có thể gửi thông báo khi có kết quả mới.',
      category: 'medical_record',
    },
    {
      question: 'Kết quả siêu âm và xét nghiệm có được lưu trên hệ thống không?',
      answer:
        'Các kết quả được cơ sở cập nhật có thể được lưu cùng hồ sơ khám dưới dạng thông tin hoặc tệp đính kèm để thuận tiện cho việc theo dõi.',
      category: 'medical_record',
    },
    {
      question: 'Tôi có thể xem lại đơn thuốc đã được kê không?',
      answer:
        'Bạn có thể xem đơn thuốc trong chi tiết lần khám tương ứng. Việc sử dụng thuốc cần tuân theo chỉ định của bác sĩ.',
      category: 'prescription',
    },
    {
      question: 'Khi nào tôi nhận được thông báo nhắc lịch?',
      answer:
        'Hệ thống có thể gửi thông báo trước lịch hẹn theo cấu hình của cơ sở. Bạn nên kiểm tra thông báo trong ứng dụng và thông tin liên hệ đã đăng ký.',
      category: 'notification',
    },
    {
      question: 'Thông tin sức khỏe của tôi có được bảo mật không?',
      answer:
        'Hệ thống giới hạn quyền truy cập theo vai trò và mục đích công việc. Bạn cũng nên bảo vệ mật khẩu, không chia sẻ mã xác minh và đăng xuất khi sử dụng thiết bị công cộng.',
      category: 'security',
    },
    {
      question: 'Tôi cần làm gì khi có dấu hiệu sức khỏe bất thường?',
      answer:
        'Bạn nên liên hệ ngay với cơ sở y tế hoặc nhân viên y tế để được hướng dẫn phù hợp. Không nên chỉ dựa vào nội dung trên hệ thống để tự chẩn đoán hoặc trì hoãn việc thăm khám.',
      category: 'health_support',
    },
  ];
  const admins = await staffRepository.find({
    relations: { roles: true },
    where: {
      roles: { name: RoleEnum.ADMIN },
    },
  });
  const faqs = faqData.map((faq, index) => ({
    authorId: admins[index % admins.length].id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    status: FaqStatusEnum.ACTIVE,
    createdAt: new Date(new Date().getTime() - 6 * (180 + index) * 24 * 60 * 60 * 1000),
    updatedAt: new Date(new Date().getTime() - 6 * (180 + index) * 24 * 60 * 60 * 1000),
  }));
  await faqRepository.save(faqs);
}

async function insertArticles() {
  const doctors = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.DOCTOR } },
  });

  const admins = await staffRepository.find({
    relations: { roles: true },
    where: {
      roles: { name: RoleEnum.ADMIN },
    },
  });
  const articleSummary =
    'Bài viết cung cấp những kiến thức cơ bản và thông tin tham khảo hữu ích, giúp mẹ bầu chủ động hơn trong quá trình theo dõi và chăm sóc thai kỳ.';

  const articleContent = `
  <h2>Thông tin tổng quan</h2>
  <p>
    Thai kỳ là một hành trình quan trọng, trong đó việc theo dõi sức khỏe thường xuyên
    và duy trì thói quen sinh hoạt phù hợp có vai trò thiết yếu đối với mẹ và bé.
  </p>

  <h2>Những điều cần lưu ý</h2>
  <p>
    Mẹ bầu nên thực hiện lịch khám theo hướng dẫn của nhân viên y tế, duy trì chế độ
    sinh hoạt hợp lý, nghỉ ngơi đầy đủ và theo dõi những thay đổi của cơ thể.
  </p>

  <p>
    Nội dung trong bài viết chỉ mang tính chất tham khảo và không thay thế cho việc
    thăm khám, chẩn đoán hoặc tư vấn trực tiếp từ bác sĩ.
  </p>
`;

  const articleTitles = [
    'Những điều cần biết trong ba tháng đầu thai kỳ',
    'Lịch khám thai định kỳ dành cho mẹ bầu',
    'Vai trò của dinh dưỡng trong quá trình mang thai',
    'Những thay đổi thường gặp của cơ thể khi mang thai',
    'Cách chuẩn bị cho lần khám thai đầu tiên',
    'Tầm quan trọng của việc theo dõi sức khỏe thai kỳ',
    'Những xét nghiệm thường gặp trong thai kỳ',
    'Siêu âm thai và những thông tin mẹ bầu cần biết',
    'Cách xây dựng thói quen nghỉ ngơi phù hợp khi mang thai',
    'Vận động an toàn và phù hợp trong thai kỳ',
    'Những vật dụng cần chuẩn bị trước khi sinh',
    'Cách theo dõi lịch hẹn và kết quả khám thai',
    'Những điều cần biết về hồ sơ thai sản',
    'Vai trò của gia đình trong việc chăm sóc mẹ bầu',
    'Cách lựa chọn cơ sở khám thai phù hợp',
    'Tìm hiểu về các gói dịch vụ chăm sóc thai sản',
    'Những lưu ý khi sử dụng thuốc trong thai kỳ',
    'Cách theo dõi các chỉ số sức khỏe khi mang thai',
    'Chuẩn bị tâm lý và kiến thức trước ngày sinh',
    'Chăm sóc sức khỏe mẹ sau sinh và những điều cần biết',
  ];

  const createSlug = (value: string): string => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const data = articleTitles.map((title, index) => ({
    authorId: doctors[index % doctors.length].id,
    title,
    // Thêm số thứ tự để chắc chắn slug không trùng
    slug: `${createSlug(title)}-${String(index + 1).padStart(2, '0')}`,
    summary: articleSummary,
    content: articleContent,
    status: ArticleStatus.PUBLISHED,
    approvedBy: admins[index % admins.length].id,
    approvedAt: new Date(new Date().getTime() - index * 7 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(new Date().getTime() - index * 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(new Date().getTime() - (index * 7 + 1) * 24 * 60 * 60 * 1000),
    updatedAt: new Date(new Date().getTime() - (index * 7 + 1) * 24 * 60 * 60 * 1000),
  }));

  await articleRepository.save(data);
}

async function insertFacility() {
  const normalizeVietnameseText = (value: string) => {
    return String(value)
      .trim()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  };

  const buildProvinceAbbreviation = (province?: string | null) => {
    if (!province || !String(province).trim()) {
      return 'VN';
    }

    const normalizedProvince = normalizeVietnameseText(province)
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(THANH PHO|TINH|TP)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalizedProvince.split(' ').filter(Boolean);
    if (words.length === 0) return 'VN';
    return words
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  };

  const generateFacilityCode = async (province?: string | null) => {
    const prefix = `CS-${buildProvinceAbbreviation(province)}`;
    const rows = await facilityRepository
      .createQueryBuilder('facility')
      .withDeleted()
      .select('facility.code', 'code')
      .where('facility.code LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawMany<{ code: string }>();

    const existingCodes = rows.map((row) => row.code);
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextSequence =
      existingCodes.reduce((maxSequence, code) => {
        const match = code.match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
        return match ? Math.max(maxSequence, Number(match[1])) : maxSequence;
      }, 0) + 1;

    return `${prefix}-${String(nextSequence).padStart(2, '0')}`;
  };

  const admins = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.ADMIN } },
  });
  const baseFacilities = [
    {
      name: 'MCS Cầu Giấy',
      phone: '02473010001',
      email: 'caugiay@mcs.com.vn',
      address: 'Số 15 phố Trần Thái Tông, phường Cầu Giấy, Hà Nội',
      province: 'Hà Nội',
      ward: 'Cầu Giấy',
      latitude: '21.0338890',
      longitude: '105.7887220',
      status: 'active',
    },
    {
      name: 'MCS Hà Đông',
      phone: '02473010002',
      email: 'hadong@mcs.com.vn',
      address: 'Số 28 đường Tố Hữu, phường Hà Đông, Hà Nội',
      province: 'Hà Nội',
      ward: 'Hà Đông',
      latitude: '20.9903270',
      longitude: '105.7870800',
      status: 'active',
    },
    {
      name: 'MCS Thanh Xuân',
      phone: '02473010003',
      email: 'thanhxuan@mcs.com.vn',
      address: 'Số 42 đường Nguyễn Trãi, phường Thanh Xuân, Hà Nội',
      province: 'Hà Nội',
      ward: 'Thanh Xuân',
      latitude: '21.0021710',
      longitude: '105.8195040',
      status: 'active',
    },
    {
      name: 'MCS Hai Bà Trưng',
      phone: '02473010004',
      email: 'haibatrung@mcs.com.vn',
      address: 'Số 36 phố Đại Cồ Việt, phường Hai Bà Trưng, Hà Nội',
      province: 'Hà Nội',
      ward: 'Hai Bà Trưng',
      latitude: '21.0071010',
      longitude: '105.8489530',
      status: 'active',
    },
    {
      name: 'MCS Long Biên',
      phone: '02473010005',
      email: 'longbien@mcs.com.vn',
      address: 'Số 52 đường Nguyễn Văn Cừ, phường Long Biên, Hà Nội',
      province: 'Hà Nội',
      ward: 'Long Biên',
      latitude: '21.0416610',
      longitude: '105.8750880',
      status: 'active',
    },
  ];
  const facilities: Facility[] = [];

  for (let i = 0; i < baseFacilities.length; i++) {
    const item = {
      ...baseFacilities[i],
      code: await generateFacilityCode(baseFacilities[i].province),
      ownerId: admins[baseFacilities.indexOf(baseFacilities[i]) % admins.length].id,
      floorCount: (i % 2) + 4,
      status: ActiveStatus.ACTIVE,
      createdAt: new Date(new Date().getTime() - 180 * 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(new Date().getTime() - 180 * 7 * 24 * 60 * 60 * 1000),
    };
    const saved = await facilityRepository.save(item);
    facilities.push(saved);
  }

  admins.forEach((admin, index) => {
    const facility =
      facilities.find((f) => f.ownerId === admin.id) || facilities[index % facilities.length];
    admin.facilityId = facility.id;
  });
  await staffRepository.save(admins);
  const staffs = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: Not(In([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN])) } },
  });

  staffs.forEach((staff, index) => {
    const facility = facilities[index % facilities.length];
    staff.facilityId = facility.id;
  });
  await staffRepository.save(staffs);
}

async function insertRooms() {
  const facilities = await facilityRepository.find();
  const roomTypes = await roomTypeRepository.find();

  const getNextSequence = (existingCodes: string[], prefix: string, padding: number) => {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}[-_](\\d+)$`);
    const maxSequence = existingCodes.reduce((max, code) => {
      if (code === prefix) return Math.max(max, 1);
      const match = code.match(pattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return maxSequence + 1;
  };

  const generateRoomCode = async (facility: Facility, codeSequenceCache?: Map<string, number>) => {
    const prefix = `R-${facility.code}`;
    const cacheKey = `${facility.id}:${prefix}`;

    if (!codeSequenceCache?.has(cacheKey)) {
      const rows = await roomRepository
        .createQueryBuilder('room')
        .withDeleted()
        .select('room.code', 'code')
        .where('room.facilityId = :facilityId', { facilityId: facility.id })
        .andWhere('room.code LIKE :pattern', { pattern: `${prefix}-%` })
        .getRawMany<{ code: string }>();

      const existingCodes = rows.map((row) => row.code);
      const nextSequence = getNextSequence(existingCodes, prefix, 3);
      codeSequenceCache?.set(cacheKey, nextSequence);
      if (!codeSequenceCache) {
        return `${prefix}-${String(nextSequence).padStart(3, '0')}`;
      }
    }

    const sequence = codeSequenceCache!.get(cacheKey)!;
    codeSequenceCache!.set(cacheKey, sequence + 1);
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  };

  for (let index = 0; index < facilities.length; index++) {
    const floorCount = (index % 2) + 3;
    for (let floor = 1; floor <= floorCount; floor++) {
      const roomCount = Math.floor(Math.random() * 5) + 4;
      for (let room = 1; room <= roomCount; room++) {
        const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
        const newRoom = {
          facilityId: facilities[index].id,
          floor: String(floor),
          roomTypeId: roomType.id,
          code: await generateRoomCode(facilities[index]),
          name: `Phòng ${floor}${String(room).padStart(2, '0')}`,
          status: ActiveStatus.ACTIVE,
          createdAt: new Date(facilities[index].createdAt),
          updatedAt: new Date(facilities[index].updatedAt),
        };
        await roomRepository.save(newRoom);
      }
    }
  }
}

async function insertUsers() {
  const lastNameList = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Vũ',
    'Đặng',
    'Bùi',
    'Đỗ',
    'Hồ',
    'Ngô',
    'Dương',
    'Lý',
    'Phan',
    'Trương',
    'Đoàn',
    'Cao',
    'Võ',
    'Đinh',
    'Hà',
    'Mạc',
    'Tạ',
    'Lâm',
    'Tô',
  ];
  const firstNameList = [
    'Minh',
    'Anh',
    'Hà',
    'Hương',
    'Lan',
    'Linh',
    'Mai',
    'Ngọc',
    'Phương',
    'Quỳnh',
    'Thảo',
    'Trang',
    'Tuấn',
    'Vân',
    'Vy',
    'Yến',
    'Bảo',
    'Châu',
    'Duy',
    'Giang',
    'Hải',
    'Khang',
    'Khánh',
    'Nguyên',
    'Phát',
    'Quang',
    'Sơn',
    'Thành',
    'Thiên',
    'Trường',
    'Tuệ',
    'Vinh',
    'Yên',
    'An',
    'Anh',
    'Bình',
    'Chi',
    'Dung',
    'Dương',
    'Giang',
    'Hà',
    'Hạnh',
    'Hiền',
    'Hoa',
    'Hương',
    'Lan',
    'Linh',
    'Mai',
    'Minh',
    'My',
    'Nga',
    'Ngân',
    'Ngọc',
    'Nhung',
    'Phương',
    'Quỳnh',
    'Thảo',
    'Trang',
    'Trâm',
    'Uyên',
    'Vân',
    'Yến',
  ];
  const middleNameList = [
    'Văn',
    'Thị',
    'Hữu',
    'Ngọc',
    'Quốc',
    'Đức',
    'Thanh',
    'Minh',
    'Bảo',
    'Gia',
    'Hoàng',
    'Khánh',
    'Phương',
    'Trọng',
    'Anh',
  ];
  const seedLocations = [
    // Hà Nội
    {
      street: 'Đường Trần Thái Tông',
      ward: 'Cầu Giấy',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Nguyễn Phong Sắc',
      ward: 'Cầu Giấy',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Hoàng Quốc Việt',
      ward: 'Nghĩa Đô',
      province: 'Hà Nội',
    },
    {
      street: 'Phố Kim Mã',
      ward: 'Ba Đình',
      province: 'Hà Nội',
    },
    {
      street: 'Phố Đội Cấn',
      ward: 'Ngọc Hà',
      province: 'Hà Nội',
    },
    {
      street: 'Phố Tôn Đức Thắng',
      ward: 'Đống Đa',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Tây Sơn',
      ward: 'Đống Đa',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Nguyễn Trãi',
      ward: 'Thanh Xuân',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Lê Trọng Tấn',
      ward: 'Thanh Xuân',
      province: 'Hà Nội',
    },
    {
      street: 'Phố Minh Khai',
      ward: 'Hai Bà Trưng',
      province: 'Hà Nội',
    },
    {
      street: 'Phố Bạch Mai',
      ward: 'Bạch Mai',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Tam Trinh',
      ward: 'Hoàng Mai',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Nguyễn Văn Cừ',
      ward: 'Long Biên',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Ngô Gia Tự',
      ward: 'Việt Hưng',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Tố Hữu',
      ward: 'Hà Đông',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Quang Trung',
      ward: 'Hà Đông',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Xuân La',
      ward: 'Tây Hồ',
      province: 'Hà Nội',
    },
    {
      street: 'Đường Hồ Tùng Mậu',
      ward: 'Từ Liêm',
      province: 'Hà Nội',
    },
    {
      street: 'Đường 32',
      ward: 'Hoài Đức',
      province: 'Hà Nội',
    },
    {
      street: 'Đường tỉnh 419',
      ward: 'Thạch Thất',
      province: 'Hà Nội',
    },

    // Hải Phòng
    {
      street: 'Đường Lạch Tray',
      ward: 'Lê Chân',
      province: 'Hải Phòng',
    },
    {
      street: 'Đường Tô Hiệu',
      ward: 'Lê Chân',
      province: 'Hải Phòng',
    },
    {
      street: 'Đường Đà Nẵng',
      ward: 'Ngô Quyền',
      province: 'Hải Phòng',
    },

    // Quảng Ninh
    {
      street: 'Đường Trần Quốc Nghiễn',
      ward: 'Hạ Long',
      province: 'Quảng Ninh',
    },
    {
      street: 'Đường Hạ Long',
      ward: 'Bãi Cháy',
      province: 'Quảng Ninh',
    },
    {
      street: 'Đường Trần Phú',
      ward: 'Cẩm Phả',
      province: 'Quảng Ninh',
    },

    // Bắc Ninh
    {
      street: 'Đường Lý Thái Tổ',
      ward: 'Kinh Bắc',
      province: 'Bắc Ninh',
    },
    {
      street: 'Đường Nguyễn Gia Thiều',
      ward: 'Võ Cường',
      province: 'Bắc Ninh',
    },

    // Hưng Yên
    {
      street: 'Đường Nguyễn Văn Linh',
      ward: 'Phố Hiến',
      province: 'Hưng Yên',
    },
    {
      street: 'Đường Nguyễn Bình',
      ward: 'Mỹ Hào',
      province: 'Hưng Yên',
    },

    // Ninh Bình
    {
      street: 'Đường Tràng An',
      ward: 'Hoa Lư',
      province: 'Ninh Bình',
    },
    {
      street: 'Đường Đinh Tiên Hoàng',
      ward: 'Ninh Bình',
      province: 'Ninh Bình',
    },

    // Thanh Hóa
    {
      street: 'Đường Lê Hoàn',
      ward: 'Hạc Thành',
      province: 'Thanh Hóa',
    },
    {
      street: 'Đường Bà Triệu',
      ward: 'Hạc Thành',
      province: 'Thanh Hóa',
    },
    {
      street: 'Đường Hồ Xuân Hương',
      ward: 'Sầm Sơn',
      province: 'Thanh Hóa',
    },

    // Nghệ An
    {
      street: 'Đường Lê Lợi',
      ward: 'Vinh',
      province: 'Nghệ An',
    },
    {
      street: 'Đường Nguyễn Sỹ Sách',
      ward: 'Trường Vinh',
      province: 'Nghệ An',
    },

    // Đà Nẵng
    {
      street: 'Đường Nguyễn Văn Linh',
      ward: 'Hải Châu',
      province: 'Đà Nẵng',
    },
    {
      street: 'Đường Ngô Quyền',
      ward: 'An Hải',
      province: 'Đà Nẵng',
    },
    {
      street: 'Đường Điện Biên Phủ',
      ward: 'Thanh Khê',
      province: 'Đà Nẵng',
    },

    // Khánh Hòa
    {
      street: 'Đường Trần Phú',
      ward: 'Nha Trang',
      province: 'Khánh Hòa',
    },
    {
      street: 'Đường 23 Tháng 10',
      ward: 'Tây Nha Trang',
      province: 'Khánh Hòa',
    },

    // Thành phố Hồ Chí Minh
    {
      street: 'Đường Nguyễn Thị Minh Khai',
      ward: 'Bàn Cờ',
      province: 'Thành phố Hồ Chí Minh',
    },
    {
      street: 'Đường Điện Biên Phủ',
      ward: 'Gia Định',
      province: 'Thành phố Hồ Chí Minh',
    },
    {
      street: 'Đường Võ Văn Ngân',
      ward: 'Thủ Đức',
      province: 'Thành phố Hồ Chí Minh',
    },
    {
      street: 'Đường Nguyễn Văn Linh',
      ward: 'Tân Hưng',
      province: 'Thành phố Hồ Chí Minh',
    },

    // Cần Thơ
    {
      street: 'Đường 30 Tháng 4',
      ward: 'Ninh Kiều',
      province: 'Cần Thơ',
    },
    {
      street: 'Đường Võ Văn Kiệt',
      ward: 'Bình Thủy',
      province: 'Cần Thơ',
    },

    // Huế
    {
      street: 'Đường Lê Lợi',
      ward: 'Thuận Hóa',
      province: 'Huế',
    },
    {
      street: 'Đường Nguyễn Huệ',
      ward: 'Phú Xuân',
      province: 'Huế',
    },
  ];

  const removeVietnameseTones = (value: string): string => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const generateName = (index: number): string => {
    const lastName = lastNameList[index % lastNameList.length];

    const middleName =
      middleNameList[Math.floor(index / lastNameList.length) % middleNameList.length];

    const firstName =
      firstNameList[
        Math.floor(index / (lastNameList.length * middleNameList.length)) % firstNameList.length
      ];

    return `${lastName} ${middleName} ${firstName}`;
  };

  const generateEmail = (name: string, sequence: number): string => {
    const normalizedName = removeVietnameseTones(name).toLowerCase().trim().replace(/\s+/g, '.');

    return `${normalizedName}.${String(sequence).padStart(4, '0')}@example.test`;
  };

  const generateDateOfBirth = (index: number): string => {
    const year = 1985 + (index % 18);
    const month = String((index % 12) + 1).padStart(2, '0');
    const day = String((index % 28) + 1).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  for (let i = 0; i < 11; i++) {
    // chia insert 100 user 1 lần
    for (let j = 0; j < 100; j++) {
      const name = generateName(i * 100 + j);
      const email = generateEmail(name, i * 100 + j + 1);
      const dateOfBirth = generateDateOfBirth(i * 100 + j);
      const addressInfo = seedLocations[i % seedLocations.length];
      const cccd = '0123456' + String(i * 100 + j + 1).padStart(5, '0');
      const phone = '098765' + String(i * 100 + j + 1).padStart(4, '0');
      const userCreatedAt = new Date(
        new Date().getTime() - (3 * 370 - i * 100 + j) * 24 * 60 * 60 * 1000,
      );

      const userData = {
        cccd,
        name,
        phone,
        email,
        avatar: 'https://i.pravatar.cc/600?u=' + i * 100 + j + 1,
        dateOfBirth,
        address: addressInfo.street,
        priorityLevel: Math.floor(Math.random() * 3),
        province: addressInfo.province,
        ward: addressInfo.ward,
        status: UserStatusEnum.ACTIVE,
        emergencyContactName: generateName(i * 100 + j + 1),
        emergencyContactPhone: '096754' + String(i * 100 + j + 1).padStart(4, '0'),
        emergencyContactRelation: 'Người thân',
        createdAt: userCreatedAt,
        updatedAt: userCreatedAt,
      };
      await userRepository.save(userData);
    }
  }
}

async function insertPregnancyProfiles() {
  const generatePregnancyCode = async (date: Date) => {
    const year = date.getFullYear().toString().slice(-2); // Lấy 2 chữ số cuối của năm hiện tại
    const result = await pregnancyProfileRepository.query(
      `
  SELECT COALESCE(
    MAX(
      CAST(
        RIGHT(code, 4)
        AS UNSIGNED
      )
    ),
    0
  ) AS max_number
  FROM pregnancy_profiles
  WHERE code LIKE ?
  `,
      [`PW${year}%`], // dùng prefix là PW là pregnant woman
    );

    // tạo string nextNumber với 4 chữ số, ví dụ: 0001, 0002, 0003, ...
    const nextNumber = (Number(result[0].max_number) + 1).toString().padStart(4, '0');
    return `PW${year}${nextNumber}`;
  };

  const formatDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const staffs = await staffRepository.find({
    where: { roles: { name: RoleEnum.STAFF } },
  });

  const users = await userRepository.find({
    where: { status: UserStatusEnum.ACTIVE },
  });
  const data = [];

  for (const user of users) {
    if (user.createdAt.getTime() > new Date().getTime() - 30 * 24 * 60 * 60 * 1000) {
      continue;
    }
    const lastMenstrualPeriod = new Date(
      new Date(user.createdAt).getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
    );
    const random = Math.floor(Math.random() * 100) + 1;
    const fetalCount = random <= 90 ? 1 : random <= 99 ? 2 : 3; // Xác suất: 90% đơn thai, 9% song thai, 1% tam thai
    const paraFullTerm = Math.floor(Math.random() * 5);
    const paraPremature = Math.floor(Math.random() * 5);
    const paraAbortion = Math.floor(Math.random() * 5);

    const pregnancyProfileData: Partial<PregnancyProfile> = {
      patientId: user.id,
      // code: await generatePregnancyCode(new Date(user.createdAt)),
      lastMenstrualPeriod: formatDateOnly(lastMenstrualPeriod),
      expectedDueDate: formatDateOnly(
        new Date(lastMenstrualPeriod.getTime() + 280 * 24 * 60 * 60 * 1000),
      ),
      fetalCount: fetalCount,
      status: PregnancyProfileStatus.ACTIVE,
      gravida: paraFullTerm + paraPremature + paraAbortion + 1,
      paraFullTerm: paraFullTerm,
      paraPremature: paraPremature,
      paraAbortion: paraAbortion,
      paraLivingChildren: paraFullTerm + paraPremature,
      riskLevel: Math.floor(Math.random() * 100 + 1) > 10 ? RiskLevel.LOW : RiskLevel.HIGH,
      notes: '',
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.createdAt),
      createdBy: staffs[Math.floor(Math.random() * staffs.length)].id,
    };

    if (
      // Nếu người dùng đã được tạo hơn 2 năm trước và chưa quá 1 ngày trước, tạo thêm một hồ sơ thai kỳ khác
      new Date(user.createdAt).getTime() + 2 * 365 * 24 * 60 * 60 * 1000 <
      new Date().getTime() - 1 * 24 * 60 * 60 * 1000
    ) {
      // complete lần trước, sau đó push vào array
      pregnancyProfileData.status = PregnancyProfileStatus.COMPLETED;
      data.push(pregnancyProfileData);
      // tạo data cho lần 2
      const lastMenstrualPeriod2 = new Date(
        lastMenstrualPeriod.getTime() + 2 * 365 * 24 * 60 * 60 * 1000,
      );
      const fetalCount2 = random <= 90 ? 1 : random <= 99 ? 2 : 3; // Xác suất: 90% đơn thai, 9% song thai, 1% tam thai

      const pregnancyProfileData2: Partial<PregnancyProfile> = {
        patientId: user.id,
        // code: await generatePregnancyCode(new Date(user.createdAt)),
        lastMenstrualPeriod: formatDateOnly(lastMenstrualPeriod2),
        expectedDueDate: formatDateOnly(
          new Date(lastMenstrualPeriod2.getTime() + 280 * 24 * 60 * 60 * 1000),
        ),
        fetalCount: fetalCount2,
        status: PregnancyProfileStatus.ACTIVE,
        gravida: paraFullTerm + paraPremature + paraAbortion + 2,
        paraFullTerm: paraFullTerm + 1,
        paraPremature: paraPremature,
        paraAbortion: paraAbortion,
        paraLivingChildren: paraFullTerm + paraPremature + fetalCount,
        riskLevel: Math.floor(Math.random() * 100 + 1) > 10 ? RiskLevel.LOW : RiskLevel.HIGH,
        notes: '',
        createdAt: new Date(new Date(user.createdAt).getTime() + 2 * 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(new Date(user.createdAt).getTime() + 2 * 365 * 24 * 60 * 60 * 1000),
        createdBy: staffs[Math.floor(Math.random() * staffs.length)].id,
      };
      data.push(pregnancyProfileData2);
    } else {
      data.push(pregnancyProfileData);
    }
  }
  const fullData = data.sort((a, b) => {
    const timeA = a.createdAt?.getTime() ?? 0;
    const timeB = b.createdAt?.getTime() ?? 0;

    return timeA - timeB;
  });
  for (const item of fullData) {
    item.code = await generatePregnancyCode(new Date(item.createdAt!));
    await pregnancyProfileRepository.save(item);
  }
}

async function insertUserAuths(): Promise<void> {
  const users = await userRepository.find();
  const hashPassword = await bcrypt.hash('Password@123', 10);
  const data = users.map((user) => {
    const userAuth = {
      userId: user.id,
      email: user.email,
      password: hashPassword,
      status: UserStatusEnum.ACTIVE,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.createdAt),
    };
    return userAuth;
  });
  await userAuthRepository.save(data);
}

async function insertShiftSlots(): Promise<void> {
  // todo: fix
  const facilities = await facilityRepository.find();
  const shiftSlots = [
    {
      name: 'Ca sáng',
      startTime: '07:00:00',
      endTime: '11:00:00',
      code: 'CA_SANG',
    },
    {
      name: 'Ca chiều',
      startTime: '13:00:00',
      endTime: '17:00:00',
      code: 'CA_CHIEU',
    },
    {
      name: 'Ca tối',
      startTime: '18:00:00',
      endTime: '22:00:00',
      code: 'CA_TOI',
    },
    {
      name: 'Ca đêm',
      startTime: '22:00:00',
      endTime: '06:00:00',
      code: 'CA_DEM',
      overnight: true,
    },
  ];

  for (const facility of facilities) {
    for (const shiftSlot of shiftSlots) {
      const newShiftSlot = {
        facilityId: facility.id,
        code: shiftSlot.code,
        name: shiftSlot.name,
        startTime: shiftSlot.startTime,
        endTime: shiftSlot.endTime,
        isOvernight: shiftSlot.overnight ?? false,
      };
      await shiftSlotRepository.save(newShiftSlot);
    }
  }
}

async function insertSettings(): Promise<void> {
  await settingRepository.save([
    { key: 'site.name', value: 'Maternity Care System', group: 'general', isPublic: 1 },
    {
      key: 'site.description',
      value: 'Hệ thống quản lý chăm sóc thai sản',
      group: 'general',
      isPublic: 1,
    },
    { key: 'contact.email', value: 'support@mcs.com.vn', group: 'contact', isPublic: 1 },
    { key: 'contact.phone', value: '02473010000', group: 'contact', isPublic: 1 },
    { key: 'appointment.reminder_hours', value: 24, group: 'appointment', isPublic: 0 },
    { key: 'upload.max_file_size_mb', value: 10, group: 'upload', isPublic: 0 },
  ]);
}

async function insertServiceCatalog(): Promise<void> {
  const serviceTypes = await serviceTypeRepository.save([
    {
      code: 'CONSULTATION',
      name: 'Khám và tư vấn',
      description:
        'Các dịch vụ khám thai định kỳ, khám thai lần đầu, khám thai nguy cơ cao và tư vấn sức khỏe thai kỳ.',
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'ULTRASOUND',
      name: 'Siêu âm',
      description:
        'Các dịch vụ siêu âm thai 2D, 4D, siêu âm hình thái và siêu âm Doppler theo từng mốc thai kỳ.',
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'LAB_TEST',
      name: 'Xét nghiệm',
      description:
        'Các xét nghiệm máu, nước tiểu, đường huyết, nhóm máu và những xét nghiệm cơ bản trong thai kỳ.',
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'PRENATAL_SCREENING',
      name: 'Sàng lọc trước sinh',
      description:
        'Các dịch vụ Double Test, Triple Test, NIPT và sàng lọc nguy cơ bất thường trong thai kỳ.',
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'MATERNAL_MONITORING',
      name: 'Theo dõi sức khỏe thai kỳ',
      description:
        'Các dịch vụ theo dõi tim thai, cơn co tử cung, huyết áp và các chỉ số sức khỏe của thai phụ.',
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'POSTPARTUM_CARE',
      name: 'Chăm sóc sau sinh',
      description:
        'Các dịch vụ theo dõi sức khỏe mẹ, chăm sóc vết mổ, tư vấn nuôi con và phục hồi sau sinh.',
      status: ActiveStatus.ACTIVE,
    },
  ]);

  const typeByCode = new Map(serviceTypes.map((type) => [type.code, type]));

  const findCodesByPrefix = async (prefix: string) => {
    const rows = await serviceRepository
      .createQueryBuilder('service')
      .select('service.code', 'code')
      .where('service.code = :prefix OR service.code LIKE :pattern', {
        prefix,
        pattern: `${prefix}_%`,
      })
      .getRawMany<{ code: string }>();

    return rows.map((row) => row.code);
  };
  const generateCode = async (name: string) => {
    const prefix = buildCodePrefixFromName(name, 'SERVICE');
    const existingCodes = await findCodesByPrefix(prefix);
    return buildNextCodeFromExisting(prefix, existingCodes);
  };
  const services = [
    {
      name: 'Khám thai định kỳ',
      description:
        'Theo dõi sức khỏe thai phụ và đánh giá sự phát triển của thai nhi theo lịch khám.',
      serviceTypeId: typeByCode.get('CONSULTATION')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '250000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Khám thai nguy cơ cao',
      description: 'Khám và theo dõi chuyên sâu dành cho thai phụ có yếu tố nguy cơ trong thai kỳ.',
      serviceTypeId: typeByCode.get('CONSULTATION')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '500000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Tư vấn kế hoạch chăm sóc thai kỳ',
      description:
        'Tư vấn lịch khám, xét nghiệm, siêu âm và chăm sóc phù hợp theo từng giai đoạn thai kỳ.',
      serviceTypeId: typeByCode.get('CONSULTATION')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '250000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Siêu âm thai 2D',
      description: 'Kiểm tra vị trí thai, tim thai và các chỉ số phát triển cơ bản của thai nhi.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '200000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Siêu âm thai 4D',
      description: 'Siêu âm hình ảnh thai nhi bằng công nghệ 4D và đánh giá các chỉ số phát triển.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '450000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Siêu âm đo độ mờ da gáy',
      description: 'Đo độ mờ da gáy trong giai đoạn phù hợp để hỗ trợ sàng lọc nguy cơ bất thường.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '500000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Siêu âm hình thái thai nhi',
      description: 'Khảo sát hình thái và cấu trúc thai nhi theo mốc thai kỳ được khuyến nghị.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '650000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Siêu âm Doppler thai',
      description:
        'Đánh giá tuần hoàn máu giữa thai phụ, nhau thai và thai nhi bằng siêu âm Doppler.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '550000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Xét nghiệm công thức máu',
      description:
        'Đánh giá các chỉ số tế bào máu và hỗ trợ phát hiện tình trạng thiếu máu trong thai kỳ.',
      serviceTypeId: typeByCode.get('LAB_TEST')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '150000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Xét nghiệm nước tiểu',
      description: 'Kiểm tra các chỉ số nước tiểu để hỗ trợ theo dõi sức khỏe thai kỳ.',
      serviceTypeId: typeByCode.get('LAB_TEST')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '100000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Xét nghiệm nhóm máu và yếu tố Rh',
      description: 'Xác định nhóm máu ABO và yếu tố Rh của thai phụ.',
      serviceTypeId: typeByCode.get('LAB_TEST')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '180000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Xét nghiệm đường huyết',
      description:
        'Đo nồng độ đường trong máu và hỗ trợ đánh giá nguy cơ rối loạn đường huyết thai kỳ.',
      serviceTypeId: typeByCode.get('LAB_TEST')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '120000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Nghiệm pháp dung nạp glucose',
      description: 'Xét nghiệm hỗ trợ phát hiện đái tháo đường thai kỳ theo chỉ định chuyên môn.',
      serviceTypeId: typeByCode.get('LAB_TEST')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 300,
      basePrice: '350000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Sàng lọc Double Test',
      description: 'Sàng lọc nguy cơ một số bất thường nhiễm sắc thể trong ba tháng đầu thai kỳ.',
      serviceTypeId: typeByCode.get('PRENATAL_SCREENING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '600000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Sàng lọc Triple Test',
      description: 'Sàng lọc nguy cơ một số bất thường thai nhi trong ba tháng giữa thai kỳ.',
      serviceTypeId: typeByCode.get('PRENATAL_SCREENING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '650000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Sàng lọc NIPT cơ bản',
      description: 'Sàng lọc trước sinh không xâm lấn dựa trên ADN tự do trong máu thai phụ.',
      serviceTypeId: typeByCode.get('PRENATAL_SCREENING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '3500000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Sàng lọc nguy cơ tiền sản giật',
      description:
        'Đánh giá nguy cơ tiền sản giật dựa trên thông tin thăm khám và các chỉ số liên quan.',
      serviceTypeId: typeByCode.get('PRENATAL_SCREENING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '900000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Theo dõi tim thai',
      description: 'Theo dõi nhịp tim thai và hoạt động co bóp tử cung theo chỉ định.',
      serviceTypeId: typeByCode.get('MATERNAL_MONITORING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '250000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Theo dõi huyết áp thai kỳ',
      description: 'Đo và ghi nhận huyết áp để hỗ trợ theo dõi nguy cơ trong thai kỳ.',
      serviceTypeId: typeByCode.get('MATERNAL_MONITORING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '80000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Đánh giá sức khỏe thai kỳ tổng hợp',
      description:
        'Đánh giá tổng hợp cân nặng, huyết áp, triệu chứng và các chỉ số theo dõi của thai phụ.',
      serviceTypeId: typeByCode.get('MATERNAL_MONITORING')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '200000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Khám sức khỏe mẹ sau sinh',
      description: 'Kiểm tra tình trạng phục hồi và sức khỏe tổng quát của mẹ sau sinh.',
      serviceTypeId: typeByCode.get('POSTPARTUM_CARE')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '300000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Chăm sóc vết mổ sau sinh',
      description: 'Kiểm tra và chăm sóc vết mổ sau sinh theo quy trình chuyên môn của phòng khám.',
      serviceTypeId: typeByCode.get('POSTPARTUM_CARE')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '300000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Tư vấn chăm sóc mẹ và trẻ sơ sinh',
      description: 'Hướng dẫn theo dõi sức khỏe, chăm sóc mẹ và trẻ sơ sinh tại nhà.',
      serviceTypeId: typeByCode.get('POSTPARTUM_CARE')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '400000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      name: 'Theo dõi phục hồi sau sinh',
      description: 'Theo dõi quá trình phục hồi sức khỏe của mẹ trong giai đoạn sau sinh.',
      serviceTypeId: typeByCode.get('POSTPARTUM_CARE')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '250000.00',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
  ];

  const savedServices: Service[] = [];

  for (const service of services) {
    const code = await generateCode(service.name);
    const createdTime = new Date(new Date().getTime() - 3 * 360 * 24 * 60 * 60 * 1000);
    const saved = await serviceRepository.save({
      ...service,
      code: code,
      status: ActiveStatus.ACTIVE,
      createdAt: createdTime,
      updatedAt: createdTime,
    });
    savedServices.push(saved);
  }

  const facilities = await facilityRepository.find();
  const facilityServices = facilities.flatMap((facility, facilityIndex) =>
    savedServices.map((service, serviceIndex) => ({
      facilityId: facility.id,
      serviceId: service.id,
      price: String(Number(service.basePrice) + facilityIndex * 10000 + serviceIndex * 10000),
      durationMinutes: service.defaultDurationMinutes,
      status: ActiveStatus.ACTIVE,
    })),
  );

  await facilityServiceRepository.save(facilityServices);
}

async function insertMaternityPackages(): Promise<void> {
  const facilities = await facilityRepository.find();
  const facilityServices = await facilityServiceRepository.find({
    relations: { facility: true, service: true },
  });

  const generateCode = async function (facilityId: string, name: string): Promise<string> {
    const prefix = buildCodePrefixFromName(name, 'PACKAGE');
    const existingCodes = await findCodesByFacilityAndPrefix(facilityId, prefix);
    return buildNextCodeFromExisting(prefix, existingCodes);
  };

  const findCodesByFacilityAndPrefix = async function (
    facilityId: string,
    prefix: string,
  ): Promise<string[]> {
    const rows = await maternityPackageRepository
      .createQueryBuilder('pkg')
      .select('pkg.code', 'code')
      .where('pkg.facilityId = :facilityId', { facilityId })
      .andWhere('(pkg.code = :prefix OR pkg.code LIKE :pattern)', {
        prefix,
        pattern: `${prefix}_%`,
      })
      .getRawMany<{ code: string }>();

    return rows.map((row) => row.code);
  };

  const quantityMaternityPackages = [
    {
      name: 'Gói thai kỳ cơ bản linh hoạt',
      description:
        'Gói số lượng cơ bản dành cho thai phụ có thai kỳ ổn định, cho phép sử dụng các lượt khám, siêu âm và xét nghiệm trong thời hạn gói.',
      packageType: MaternityPackageType.QUANTITY,
      durationDays: 280,
      priorityLevel: 1,
      discountRate: 0.05,
      items: [
        {
          serviceName: 'Khám thai định kỳ',
          quantity: 4,
        },
        {
          serviceName: 'Siêu âm thai 2D',
          quantity: 3,
        },
        {
          serviceName: 'Xét nghiệm công thức máu',
          quantity: 1,
        },
        {
          serviceName: 'Xét nghiệm nước tiểu',
          quantity: 2,
        },
        {
          serviceName: 'Theo dõi huyết áp thai kỳ',
          quantity: 3,
        },
      ],
    },
    {
      name: 'Gói thai kỳ tiêu chuẩn linh hoạt',
      description:
        'Gói theo số lượng với các dịch vụ khám, siêu âm và xét nghiệm phổ biến trong suốt thai kỳ.',
      packageType: MaternityPackageType.QUANTITY,
      durationDays: 280,
      priorityLevel: 2,
      discountRate: 0.08,
      items: [
        {
          serviceName: 'Khám thai định kỳ',
          quantity: 6,
        },
        {
          serviceName: 'Siêu âm thai 2D',
          quantity: 3,
        },
        {
          serviceName: 'Siêu âm thai 4D',
          quantity: 1,
        },
        {
          serviceName: 'Siêu âm đo độ mờ da gáy',
          quantity: 1,
        },
        {
          serviceName: 'Xét nghiệm công thức máu',
          quantity: 2,
        },
        {
          serviceName: 'Xét nghiệm nước tiểu',
          quantity: 3,
        },
        {
          serviceName: 'Xét nghiệm đường huyết',
          quantity: 1,
        },
        {
          serviceName: 'Theo dõi tim thai',
          quantity: 2,
        },
      ],
    },
    {
      name: 'Gói thai kỳ nâng cao linh hoạt',
      description:
        'Gói dịch vụ nâng cao bao gồm khám định kỳ, siêu âm chuyên sâu, xét nghiệm và sàng lọc trước sinh.',
      packageType: MaternityPackageType.QUANTITY,
      durationDays: 280,
      priorityLevel: 3,
      discountRate: 0.1,
      items: [
        {
          serviceName: 'Khám thai định kỳ',
          quantity: 8,
        },
        {
          serviceName: 'Tư vấn kế hoạch chăm sóc thai kỳ',
          quantity: 1,
        },
        {
          serviceName: 'Siêu âm thai 2D',
          quantity: 4,
        },
        {
          serviceName: 'Siêu âm thai 4D',
          quantity: 2,
        },
        {
          serviceName: 'Siêu âm đo độ mờ da gáy',
          quantity: 1,
        },
        {
          serviceName: 'Siêu âm hình thái thai nhi',
          quantity: 1,
        },
        {
          serviceName: 'Xét nghiệm công thức máu',
          quantity: 2,
        },
        {
          serviceName: 'Xét nghiệm nước tiểu',
          quantity: 4,
        },
        {
          serviceName: 'Nghiệm pháp dung nạp glucose',
          quantity: 1,
        },
        {
          serviceName: 'Sàng lọc Double Test',
          quantity: 1,
          required: false,
          optional: true,
        },
        {
          serviceName: 'Theo dõi tim thai',
          quantity: 3,
        },
      ],
    },
    {
      name: 'Gói theo dõi thai kỳ nguy cơ cao',
      description:
        'Gói tăng cường số lượt khám, siêu âm Doppler, theo dõi tim thai và các dịch vụ đánh giá nguy cơ.',
      packageType: MaternityPackageType.QUANTITY,
      durationDays: 280,
      priorityLevel: 4,
      discountRate: 0.12,
      items: [
        {
          serviceName: 'Khám thai nguy cơ cao',
          quantity: 6,
        },
        {
          serviceName: 'Khám thai định kỳ',
          quantity: 6,
        },
        {
          serviceName: 'Siêu âm thai 2D',
          quantity: 4,
        },
        {
          serviceName: 'Siêu âm hình thái thai nhi',
          quantity: 1,
        },
        {
          serviceName: 'Siêu âm Doppler thai',
          quantity: 3,
        },
        {
          serviceName: 'Xét nghiệm công thức máu',
          quantity: 3,
        },
        {
          serviceName: 'Xét nghiệm nước tiểu',
          quantity: 5,
        },
        {
          serviceName: 'Nghiệm pháp dung nạp glucose',
          quantity: 1,
        },
        {
          serviceName: 'Sàng lọc nguy cơ tiền sản giật',
          quantity: 1,
        },
        {
          serviceName: 'Theo dõi tim thai',
          quantity: 5,
        },
        {
          serviceName: 'Theo dõi huyết áp thai kỳ',
          quantity: 8,
        },
      ],
    },
    {
      name: 'Gói chăm sóc mẹ và bé toàn diện',
      description:
        'Gói kết hợp theo dõi thai kỳ và chăm sóc mẹ sau sinh, phù hợp với khách hàng muốn sử dụng dịch vụ xuyên suốt.',
      packageType: MaternityPackageType.QUANTITY,
      durationDays: 280,
      priorityLevel: 5,
      discountRate: 0.15,
      items: [
        {
          serviceName: 'Khám thai định kỳ',
          quantity: 8,
        },
        {
          serviceName: 'Siêu âm thai 2D',
          quantity: 4,
        },
        {
          serviceName: 'Siêu âm thai 4D',
          quantity: 2,
        },
        {
          serviceName: 'Siêu âm hình thái thai nhi',
          quantity: 1,
        },
        {
          serviceName: 'Xét nghiệm công thức máu',
          quantity: 2,
        },
        {
          serviceName: 'Xét nghiệm nước tiểu',
          quantity: 4,
        },
        {
          serviceName: 'Theo dõi tim thai',
          quantity: 4,
        },
        {
          serviceName: 'Khám sức khỏe mẹ sau sinh',
          quantity: 2,
        },
        {
          serviceName: 'Chăm sóc vết mổ sau sinh',
          quantity: 2,
          required: false,
          optional: true,
        },
        {
          serviceName: 'Tư vấn chăm sóc mẹ và trẻ sơ sinh',
          quantity: 2,
        },
        {
          serviceName: 'Theo dõi phục hồi sau sinh',
          quantity: 2,
        },
      ],
    },
  ];

  const scheduleMaternityPackages = [
    {
      name: 'Lộ trình thai kỳ cơ bản',
      description: 'Gói lịch trình cơ bản, phân bổ dịch vụ theo các giai đoạn chính của thai kỳ.',
      packageType: MaternityPackageType.SCHEDULE,
      durationDays: 300,
      priorityLevel: 6,
      discountRate: 0.06,
      stages: [
        {
          name: 'Tam cá nguyệt thứ nhất',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 5,
          weekTo: 13,
          goal: 'Xác nhận thai, đánh giá sức khỏe ban đầu và sàng lọc sớm.',
          sortOrder: 1,
          items: [
            ['Khám thai định kỳ', 2],
            ['Siêu âm thai 2D', 1],
            ['Siêu âm đo độ mờ da gáy', 1],
            ['Xét nghiệm công thức máu', 1],
            ['Xét nghiệm nước tiểu', 1],
          ],
        },
        {
          name: 'Tam cá nguyệt thứ hai',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 14,
          weekTo: 27,
          goal: 'Theo dõi sự phát triển và khảo sát hình thái thai nhi.',
          sortOrder: 2,
          items: [
            ['Khám thai định kỳ', 2],
            ['Siêu âm hình thái thai nhi', 1],
            ['Xét nghiệm nước tiểu', 1],
            ['Xét nghiệm đường huyết', 1],
          ],
        },
        {
          name: 'Tam cá nguyệt thứ ba',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 28,
          weekTo: 40,
          goal: 'Theo dõi tăng trưởng thai nhi và chuẩn bị cho giai đoạn sinh.',
          sortOrder: 3,
          items: [
            ['Khám thai định kỳ', 3],
            ['Siêu âm thai 2D', 2],
            ['Theo dõi tim thai', 2],
            ['Theo dõi huyết áp thai kỳ', 3],
          ],
        },
      ],
    },
    {
      name: 'Lộ trình thai kỳ tiêu chuẩn',
      description:
        'Gói theo lịch trình tiêu chuẩn với khám, siêu âm, xét nghiệm và theo dõi theo từng mốc thai kỳ.',
      packageType: MaternityPackageType.SCHEDULE,
      durationDays: 330,
      priorityLevel: 7,
      discountRate: 0.09,
      stages: [
        {
          name: 'Khởi đầu thai kỳ',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 4,
          weekTo: 10,
          goal: 'Đánh giá ban đầu và lập kế hoạch chăm sóc thai kỳ.',
          sortOrder: 1,
          items: [
            ['Tư vấn kế hoạch chăm sóc thai kỳ', 1],
            ['Khám thai định kỳ', 1],
            ['Siêu âm thai 2D', 1],
            ['Xét nghiệm nhóm máu và yếu tố Rh', 1],
            ['Xét nghiệm công thức máu', 1],
            ['Xét nghiệm nước tiểu', 1],
          ],
        },
        {
          name: 'Sàng lọc quý I',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 11,
          weekTo: 13,
          goal: 'Sàng lọc nguy cơ bất thường trong ba tháng đầu.',
          sortOrder: 2,
          items: [
            ['Khám thai định kỳ', 1],
            ['Siêu âm đo độ mờ da gáy', 1],
            ['Sàng lọc Double Test', 1],
          ],
        },
        {
          name: 'Theo dõi quý II',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 14,
          weekTo: 27,
          goal: 'Theo dõi phát triển, hình thái và đường huyết thai kỳ.',
          sortOrder: 3,
          items: [
            ['Khám thai định kỳ', 3],
            ['Siêu âm thai 4D', 1],
            ['Siêu âm hình thái thai nhi', 1],
            ['Nghiệm pháp dung nạp glucose', 1],
            ['Xét nghiệm nước tiểu', 2],
          ],
        },
        {
          name: 'Theo dõi quý III',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 28,
          weekTo: 40,
          goal: 'Theo dõi tăng trưởng, tim thai và sức khỏe của thai phụ.',
          sortOrder: 4,
          items: [
            ['Khám thai định kỳ', 4],
            ['Siêu âm thai 2D', 2],
            ['Theo dõi tim thai', 3],
            ['Theo dõi huyết áp thai kỳ', 4],
          ],
        },
      ],
    },
    {
      name: 'Lộ trình thai kỳ toàn diện',
      description:
        'Gói quản lý thai kỳ đầy đủ từ giai đoạn đầu đến sau sinh, bao gồm các mốc sàng lọc quan trọng.',
      packageType: MaternityPackageType.SCHEDULE,
      durationDays: 420,
      priorityLevel: 8,
      discountRate: 0.12,
      stages: [
        {
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          name: 'Khởi đầu và đánh giá thai kỳ',
          weekFrom: 4,
          weekTo: 10,
          goal: 'Lập kế hoạch chăm sóc và đánh giá các chỉ số ban đầu.',
          sortOrder: 1,
          items: [
            ['Tư vấn kế hoạch chăm sóc thai kỳ', 1],
            ['Khám thai định kỳ', 2],
            ['Siêu âm thai 2D', 1],
            ['Xét nghiệm nhóm máu và yếu tố Rh', 1],
            ['Xét nghiệm công thức máu', 1],
            ['Xét nghiệm nước tiểu', 1],
          ],
        },
        {
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          name: 'Sàng lọc quý I',
          weekFrom: 11,
          weekTo: 13,
          goal: 'Sàng lọc sớm các nguy cơ trong thai kỳ.',
          sortOrder: 2,
          items: [
            ['Khám thai định kỳ', 1],
            ['Siêu âm đo độ mờ da gáy', 1],
            ['Sàng lọc NIPT cơ bản', 1],
            ['Sàng lọc nguy cơ tiền sản giật', 1],
          ],
        },
        {
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          name: 'Theo dõi và khảo sát hình thái',
          weekFrom: 14,
          weekTo: 27,
          goal: 'Đánh giá hình thái, phát triển và chuyển hóa thai kỳ.',
          sortOrder: 3,
          items: [
            ['Khám thai định kỳ', 3],
            ['Siêu âm thai 4D', 1],
            ['Siêu âm hình thái thai nhi', 1],
            ['Nghiệm pháp dung nạp glucose', 1],
            ['Xét nghiệm công thức máu', 1],
            ['Xét nghiệm nước tiểu', 2],
          ],
        },
        {
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          name: 'Theo dõi cuối thai kỳ',
          weekFrom: 28,
          weekTo: 40,
          goal: 'Theo dõi tăng trưởng, tuần hoàn và sức khỏe thai nhi.',
          sortOrder: 4,
          items: [
            ['Khám thai định kỳ', 5],
            ['Siêu âm thai 2D', 2],
            ['Siêu âm Doppler thai', 1],
            ['Theo dõi tim thai', 4],
            ['Theo dõi huyết áp thai kỳ', 5],
          ],
        },
        {
          name: 'Chăm sóc sau sinh',
          stageType: MaternityPackageStageType.POSTPARTUM,
          goal: 'Đánh giá phục hồi và hướng dẫn chăm sóc mẹ và trẻ sơ sinh.',
          sortOrder: 5,
          items: [
            ['Khám sức khỏe mẹ sau sinh', 2],
            ['Tư vấn chăm sóc mẹ và trẻ sơ sinh', 1],
            ['Theo dõi phục hồi sau sinh', 2],
          ],
        },
      ],
    },
    {
      name: 'Lộ trình thai kỳ nguy cơ cao',
      description:
        'Lộ trình tăng cường dành cho thai phụ có yếu tố nguy cơ, cần bác sĩ đánh giá và theo dõi sát.',
      packageType: MaternityPackageType.SCHEDULE,
      durationDays: 365,
      priorityLevel: 9,
      discountRate: 0.13,
      stages: [
        {
          name: 'Đánh giá nguy cơ ban đầu',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 4,
          weekTo: 10,
          goal: 'Xác định yếu tố nguy cơ và xây dựng kế hoạch theo dõi.',
          sortOrder: 1,
          items: [
            ['Khám thai nguy cơ cao', 2],
            ['Tư vấn kế hoạch chăm sóc thai kỳ', 1],
            ['Siêu âm thai 2D', 1],
            ['Xét nghiệm công thức máu', 1],
            ['Xét nghiệm nước tiểu', 1],
            ['Theo dõi huyết áp thai kỳ', 2],
          ],
        },
        {
          name: 'Sàng lọc nguy cơ quý I',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 11,
          weekTo: 13,
          goal: 'Đánh giá chuyên sâu nguy cơ bất thường và tiền sản giật.',
          sortOrder: 2,
          items: [
            ['Khám thai nguy cơ cao', 1],
            ['Siêu âm đo độ mờ da gáy', 1],
            ['Sàng lọc NIPT cơ bản', 1],
            ['Sàng lọc nguy cơ tiền sản giật', 1],
          ],
        },
        {
          name: 'Theo dõi chuyên sâu quý II',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 14,
          weekTo: 27,
          goal: 'Theo dõi hình thái, tuần hoàn và chuyển hóa thai kỳ.',
          sortOrder: 3,
          items: [
            ['Khám thai nguy cơ cao', 3],
            ['Siêu âm hình thái thai nhi', 1],
            ['Siêu âm Doppler thai', 1],
            ['Nghiệm pháp dung nạp glucose', 1],
            ['Xét nghiệm công thức máu', 1],
            ['Xét nghiệm nước tiểu', 3],
            ['Theo dõi huyết áp thai kỳ', 4],
          ],
        },
        {
          name: 'Theo dõi sát quý III',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 28,
          weekTo: 40,
          goal: 'Theo dõi thường xuyên sức khỏe thai phụ và thai nhi.',
          sortOrder: 4,
          items: [
            ['Khám thai nguy cơ cao', 5],
            ['Khám thai định kỳ', 3],
            ['Siêu âm Doppler thai', 3],
            ['Theo dõi tim thai', 6],
            ['Theo dõi huyết áp thai kỳ', 8],
            ['Xét nghiệm nước tiểu', 3],
          ],
        },
      ],
    },
    {
      name: 'Lộ trình mẹ và bé sau sinh',
      description:
        'Lộ trình kết hợp theo dõi cuối thai kỳ với chăm sóc và phục hồi sức khỏe mẹ sau sinh.',
      packageType: MaternityPackageType.SCHEDULE,
      durationDays: 180,
      priorityLevel: 10,
      discountRate: 0.1,
      stages: [
        {
          name: 'Chuẩn bị trước sinh',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 28,
          weekTo: 36,
          goal: 'Theo dõi cuối thai kỳ và chuẩn bị kế hoạch chăm sóc sau sinh.',
          sortOrder: 1,
          items: [
            ['Khám thai định kỳ', 3],
            ['Siêu âm thai 2D', 1],
            ['Theo dõi tim thai', 2],
            ['Theo dõi huyết áp thai kỳ', 3],
            ['Tư vấn chăm sóc mẹ và trẻ sơ sinh', 1],
          ],
        },
        {
          name: 'Theo dõi cận sinh',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 37,
          weekTo: 40,
          goal: 'Theo dõi sát sức khỏe thai phụ và thai nhi ở giai đoạn cận sinh.',
          sortOrder: 2,
          items: [
            ['Khám thai định kỳ', 3],
            ['Siêu âm Doppler thai', 1],
            ['Theo dõi tim thai', 3],
            ['Theo dõi huyết áp thai kỳ', 3],
          ],
        },
        {
          name: 'Chăm sóc sau sinh sớm',
          stageType: MaternityPackageStageType.POSTPARTUM,
          goal: 'Theo dõi sức khỏe và quá trình phục hồi sớm của mẹ.',
          sortOrder: 3,
          items: [
            ['Khám sức khỏe mẹ sau sinh', 1],
            ['Chăm sóc vết mổ sau sinh', 2, false, true],
            ['Theo dõi phục hồi sau sinh', 2],
          ],
        },
        {
          name: 'Phục hồi và chăm sóc mẹ bé',
          stageType: MaternityPackageStageType.POSTPARTUM,
          goal: 'Đánh giá phục hồi và hướng dẫn chăm sóc mẹ cùng trẻ sơ sinh.',
          sortOrder: 4,
          items: [
            ['Khám sức khỏe mẹ sau sinh', 1],
            ['Tư vấn chăm sóc mẹ và trẻ sơ sinh', 2],
            ['Theo dõi phục hồi sau sinh', 2],
          ],
        },
      ],
    },
  ];

  for (const facility of facilities) {
    const servicesForFacility = facilityServices.filter(
      (item) => String(item.facilityId) === String(facility.id),
    );
    for (const qtypkg of quantityMaternityPackages) {
      const code = await generateCode(facility.id, qtypkg.name);
      const serviceItems: DeepPartial<PackageItem>[] = [];
      qtypkg.items.map((item) => {
        const svIt = servicesForFacility.find((i) => i.service.name === item.serviceName);
        if (svIt) {
          serviceItems.push({
            facilityService: svIt,
            facilityServiceId: svIt.id,
            includedQuantity: item.quantity,
            isRequired: item?.required || false,
            isOptional: item?.optional || false,
            allowedFacilityScope: PackageServiceFacilityScope.ALL,
            sortOrder: 0,
          });
        }
      });
      const pkgPrice = serviceItems.reduce(
        (acc, item) =>
          Number(acc) + Number(item?.facilityService?.price || 0) * Number(item.includedQuantity),
        0,
      );
      const pkg = await maternityPackageRepository.save({
        code: code,
        facilityId: facility.id,
        name: qtypkg.name,
        description: qtypkg.description,
        packageType: qtypkg.packageType,
        price: String(Math.round((pkgPrice * qtypkg.discountRate) / 10000) * 10000),
        durationDays: qtypkg.durationDays,
        priorityLevel: qtypkg.priorityLevel,
        status: MaternityPackageStatus.ACTIVE,
      });
      const savedServiceItems = await packageItemRepository.save(
        serviceItems.map((item) => {
          return {
            packageId: pkg.id,
            facilityServiceId: item.facilityServiceId,
            includedQuantity: item.includedQuantity,
            isRequired: item.isRequired,
            isOptional: item.isOptional,
            allowedFacilityScope: item.allowedFacilityScope,
            sortOrder: item.sortOrder,
          };
        }),
      );
      await packageServiceFacilityRepository.save(
        savedServiceItems.map((item) => {
          return {
            packageItemId: item.id,
            facilityId: facility.id,
          };
        }),
      );
    }

    for (const schPkg of scheduleMaternityPackages) {
      const code = await generateCode(facility.id, schPkg.name);
      const pkgStgs: DeepPartial<PackageStage>[] = [];
      schPkg.stages.map((stage) => {
        const serviceItems: DeepPartial<PackageItem>[] = [];
        stage.items.map((item, index) => {
          const svIt = servicesForFacility.find((i) => i.service.name === item[0]);
          if (svIt) {
            serviceItems.push({
              facilityService: svIt,
              facilityServiceId: svIt.id,
              includedQuantity: Number(item[1]) || 1,
              isRequired: false,
              isOptional: false,
              allowedFacilityScope: PackageServiceFacilityScope.ALL,
              sortOrder: index + 1,
            });
          }
        });
        const pkgStg = {
          name: stage.name,
          stageType: stage.stageType,
          weekFrom: stage.weekFrom,
          weekTo: stage.weekTo,
          goal: stage.goal,
          sortOrder: stage.sortOrder,
          items: serviceItems || [],
        };
        pkgStgs.push(pkgStg);
      });
      // save pkgSch
      const totalPrice = pkgStgs.reduce(
        (acc, item) =>
          Number(acc) +
          Number(
            item?.items?.reduce(
              (acc, item) =>
                Number(acc) + Number(item?.facilityService?.price) * Number(item.includedQuantity),
              0,
            ),
          ),
        0,
      );
      const savedSchPkg = await maternityPackageRepository.save({
        code: code,
        facilityId: facility.id,
        name: schPkg.name,
        description: schPkg.description,
        packageType: schPkg.packageType,
        price: String(Math.round((totalPrice * schPkg.discountRate) / 10000) * 10000),
        durationDays: schPkg.durationDays,
        priorityLevel: schPkg.priorityLevel,
        status: MaternityPackageStatus.ACTIVE,
      });
      for (const pkgStg of pkgStgs) {
        await packageStageRepository.save({
          packageId: savedSchPkg.id,
          name: pkgStg.name,
          stageType: pkgStg.stageType,
          weekFrom: pkgStg.weekFrom,
          weekTo: pkgStg.weekTo,
          goal: pkgStg.goal,
          sortOrder: pkgStg.sortOrder,
        });
        const pkgStgItems = pkgStg.items?.map((item) => {
          return {
            packageId: savedSchPkg.id,
            facilityServiceId: item.facilityServiceId,
            includedQuantity: item.includedQuantity,
            isRequired: item.isRequired,
            isOptional: item.isOptional,
            allowedFacilityScope: item.allowedFacilityScope,
            sortOrder: item.sortOrder,
          };
        });
        const savedPkgItems = await packageItemRepository.save(pkgStgItems || []);
        await packageServiceFacilityRepository.save(
          savedPkgItems.map((item) => {
            return {
              packageItemId: item.id,
              facilityId: facility.id,
            };
          }),
        );
      }
    }
  }
}

async function insertShifts() {
  const facilities = await facilityRepository.find();
  // const roomTypes = await roomTypeRepository.find();
  const staffs = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: In([RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.STAFF]) } },
  });
  const shiftSlots = await shiftSlotRepository.find();
  const rooms = await roomRepository.find();
  const selectedRoomType = [
    'Phòng khám sản',
    'Phòng khám tổng quát',
    'Phòng siêu âm',
    'Phòng xét nghiệm',
    'Phòng thủ thuật',
  ];
  const firstDateOfWeek = new Date();

  firstDateOfWeek.setDate(firstDateOfWeek.getDate() - 90);
  firstDateOfWeek.setDate(firstDateOfWeek.getDate() - ((firstDateOfWeek.getDay() + 6) % 7));
  firstDateOfWeek.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setDate(nextWeek.getDate() - ((nextWeek.getDay() + 6) % 7) - 1);
  nextWeek.setHours(0, 0, 0, 0);

  const distanceDay = Math.ceil(
    (nextWeek.getTime() - firstDateOfWeek.getTime()) / (24 * 60 * 60 * 1000),
  );
  const distanceWeek = Math.ceil(distanceDay / 7);
  for (const facility of facilities) {
    const roomOfFacility = rooms.filter((room) => String(room.facilityId) === String(facility.id));
    const roomTypeInFacilityForDoctors = roomOfFacility.filter((room) =>
      selectedRoomType.includes(room.name),
    );
    const doctorsInFacility = staffs.filter(
      (staff) =>
        String(staff.facilityId) === String(facility.id) &&
        staff.roles.some((role) => role.name === RoleEnum.DOCTOR),
    );
    const staffInFacility = staffs.filter(
      (staff) =>
        String(staff.facilityId) === String(facility.id) &&
        staff.roles.some((role) => role.name !== RoleEnum.DOCTOR),
    );
    // chỉ insert ca sáng chiều tối, ko insert đêm
    const shiftSlotOfFacility = shiftSlots
      .filter((slot) => String(slot.facilityId) === String(facility.id))
      .filter((slot) => ['Ca sáng', 'Ca chiều', 'Ca tối'].includes(slot.name));

    for (let weekOffset = 0; weekOffset < distanceWeek; weekOffset++) {
      // chia thành các tuần để insert lịch cho từng tuần

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const shiftDate = new Date(
          firstDateOfWeek.getTime() + (weekOffset * 7 + dayOffset) * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .slice(0, 10);
        // insert cho từng rooms
        for (const room of roomOfFacility) {
          // mỗi room sẽ insert cho các ca
          const isNeedDoctor = roomTypeInFacilityForDoctors.includes(room);
          for (
            let shiftSlotIndex = 0;
            shiftSlotIndex < shiftSlotOfFacility.length;
            shiftSlotIndex++
          ) {
            const shiftSlot = shiftSlotOfFacility[shiftSlotIndex];
            if (isNeedDoctor) {
              const randomDoctorIndex = Math.floor(Math.random() * doctorsInFacility.length);
              const staff = doctorsInFacility[randomDoctorIndex];
              const newShift = {
                staffId: staff.id,
                roleId: staff.roles[0]?.id ?? null,
                facilityId: staff.facilityId!,
                roomId: room.id,
                slotId: shiftSlot.id,
                shiftDate,
                startTime: shiftSlot.startTime,
                endTime: shiftSlot.endTime,
                maxAppointment: 8,
                status: DoctorShiftStatus.AVAILABLE,
                createdAt: new Date(shiftDate),
                updatedAt: new Date(shiftDate),
              };
              await shiftRepository.save(newShift);
            } else {
              const randomStaffIndex = Math.floor(Math.random() * staffInFacility.length);
              const staff = staffInFacility[randomStaffIndex];
              const newShift = {
                staffId: staff.id,
                roleId: staff.roles[0]?.id ?? null,
                facilityId: staff.facilityId!,
                roomId: room.id,
                slotId: shiftSlot.id,
                shiftDate,
                startTime: shiftSlot.startTime,
                endTime: shiftSlot.endTime,
                maxAppointment: 8,
                status: DoctorShiftStatus.AVAILABLE,
                createdAt: new Date(shiftDate),
                updatedAt: new Date(shiftDate),
              };
              await shiftRepository.save(newShift);
            }
          }
        }
      }
    }
  }
}

async function insertOrders(): Promise<void> {
  const facilityServices = await facilityServiceRepository.find({
    relations: { service: true },
  });
  const facilityPackages = await maternityPackageRepository.find();
  const facilities = await facilityRepository.find();
  const pregnancyProfiles = await pregnancyProfileRepository.find();
  const dataSeed: DeepPartial<Order>[] = [];
  const generateOrderCode = (date: Date) => {
    const now = new Date(date);
    const formattedDate = now
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    const code = Math.floor(Math.random() * 1000000);
    return formattedDate + String(code).padStart(6, '0');
  };

  for (const prenancyProfile of pregnancyProfiles) {
    // chia 2 loại mua: 70% package, 30% service lẻ
    const buyDate = new Date(new Date(prenancyProfile.createdAt).getTime() + 15 * 60 * 60 * 1000);
    const randomFacility = facilities[Math.floor(Math.random() * facilities.length)];
    const randomNumber = Math.floor(Math.random() * 100);
    if (randomNumber > 30) {
      // mua package, mua 1 hoặc 2 gói to
      const randomNumberPackage = Math.floor(Math.random() * 2) + 1;
      const listPackageOfFacility = facilityPackages.filter(
        (packageItem) => String(packageItem.facilityId) === String(randomFacility.id),
      );
      for (let i = 0; i < randomNumberPackage; i++) {
        const randomPackage =
          listPackageOfFacility[Math.floor(Math.random() * listPackageOfFacility.length)];

        const newOrderDetail: DeepPartial<OrderItem> = {
          itemType: OrderItemType.PACKAGE,
          itemId: randomPackage.id,
          name: randomPackage.name,
          quantity: 1,
          unitPrice: Number(randomPackage.price),
          totalPrice: Number(randomPackage.price),
          createdAt: buyDate,
          updatedAt: buyDate,
        };

        const newOrder: DeepPartial<Order> = {
          code: generateOrderCode(buyDate),
          pregnancyProfileId: prenancyProfile.id,
          customerId: prenancyProfile.patientId,
          facilityId: randomFacility.id,
          orderType: OrderType.MATERNITY_PACKAGE,
          subtotalAmount: Number(randomPackage.price),
          discountAmount: 0,
          totalAmount: Number(randomPackage.price),
          status: OrderStatus.PAID,
          createdAt: buyDate,
          updatedAt: buyDate,
          orderItems: [newOrderDetail],
        };
        dataSeed.push(newOrder);
      }
    } else {
      // mua gói lẻ => mua nhiều lần
      const buyingCount = Math.floor(Math.random() * 3) + 3;
      for (let index = 0; index < buyingCount; index++) {
        const randomFacilityForService = facilities[Math.floor(Math.random() * facilities.length)];
        const buyDateService = new Date(
          new Date(buyDate).getTime() +
            index * (Math.floor(240 / buyingCount) + Math.random() * 10) * 24 * 60 * 60 * 1000,
        );
        const listServiceOfFacility = facilityServices.filter(
          (serviceItem) => String(serviceItem.facilityId) === String(randomFacilityForService.id),
        );
        const listServiceBuy: DeepPartial<OrderItem>[] = [];
        const countService = Math.floor(Math.random() * 3) + 1; // sẽ mua 1-3 loại service 1 lần
        for (let count = 0; count < countService; count++) {
          const randomService = listServiceOfFacility[count % listServiceOfFacility.length];
          const randomQuantity = Math.floor(Math.random() * 3) + 1; // sẽ mua 1-3 cái
          const newOrderDetail: DeepPartial<OrderItem> = {
            itemType: OrderItemType.NORMAL_SERVICE,
            itemId: randomService.id,
            name: randomService.service.name,
            quantity: randomQuantity,
            unitPrice: Number(randomService.price),
            totalPrice: Number(randomService.price) * randomQuantity,
            createdAt: buyDateService,
            updatedAt: buyDateService,
          };

          // check trùng itemId
          if (listServiceBuy.find((item) => item.itemId === newOrderDetail.itemId)) {
            const index = listServiceBuy.findIndex((item) => item.itemId === newOrderDetail.itemId);
            listServiceBuy[index] = {
              ...listServiceBuy[index],
              quantity:
                Number(newOrderDetail.quantity || 0) + Number(listServiceBuy[index].quantity || 0),
            };
          } else {
            listServiceBuy.push(newOrderDetail);
          }
        }
        const totalPrice = listServiceBuy.reduce(
          (total, item) => total + Number(item.totalPrice || 0),
          0,
        );
        const newOrder: DeepPartial<Order> = {
          code: generateOrderCode(buyDateService),
          pregnancyProfileId: prenancyProfile.id,
          customerId: prenancyProfile.patientId,
          facilityId: randomFacilityForService.id,
          orderType: OrderType.NORMAL_SERVICE,
          subtotalAmount: Number(totalPrice),
          discountAmount: 0,
          totalAmount: Number(totalPrice),
          status: OrderStatus.PAID,
          createdAt: buyDateService,
          updatedAt: buyDateService,
          orderItems: listServiceBuy,
        };

        dataSeed.push(newOrder);
      }
    }
  }
  // tạo xong dataSeed, giờ sắp xếp để insert cho đẹp
  dataSeed.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;

    return (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime();
  });

  // bắt đầu insert
  for (let index = 0; index < dataSeed.length; index++) {
    const order = dataSeed[index];
    const savedOrder = await orderRepository.save(order);
    const orderItems = dataSeed[index].orderItems as DeepPartial<OrderItem>[];
    for (let indexItem = 0; indexItem < orderItems.length; indexItem++) {
      const orderItem = orderItems[indexItem];
      await orderItemRepository.save({
        ...orderItem,
        orderId: savedOrder.id,
      });
    }
  }
}

async function insertAppointments(): Promise<void> {
  const orders = await orderRepository.find({
    relations: { orderItems: true },
  });
  const maternityPackages = await maternityPackageRepository.find({
    relations: {
      packageItems: true,
      stages: {
        items: true,
      },
    },
  });
  const facilityServices = await facilityServiceRepository.find();
  const findServiceIdOfFacilityService = (id: string) =>
    facilityServices.find((item) => item.id === id)?.serviceId;

  const items = [];
  // lọc các item cho appointment từ các order đã mua
  for (const order of orders) {
    for (const item of order.orderItems) {
      if (item.itemType === OrderItemType.NORMAL_SERVICE) {
        const facilityService = facilityServices.find((service) => service.id === item.itemId);
        if (facilityService) {
          items.push({
            serviceId: facilityService.serviceId,
            quantity: item.quantity,
            facilityId: facilityService.facilityId,
            patientId: order.customerId,
            pregnancyProfileId: order.pregnancyProfileId,
          });
        }
      } else if (item.itemType === OrderItemType.PACKAGE) {
        const maternityPackage = maternityPackages.find(
          (packageItem) => packageItem.id === item.itemId,
        );
        if (maternityPackage) {
          if (maternityPackage.packageType === MaternityPackageType.QUANTITY) {
            const itemsOfPackage = maternityPackage.packageItems;
            for (const itemOfPackage of itemsOfPackage) {
              items.push({
                serviceId: findServiceIdOfFacilityService(itemOfPackage.facilityServiceId),
                quantity: itemOfPackage.includedQuantity * item.quantity,
                facilityId: maternityPackage.facilityId,
                patientId: order.customerId,
                pregnancyProfileId: order.pregnancyProfileId,
              });
            }
          } else {
            const itemsOfStages = maternityPackage.stages;
            for (const itemOfPackage of itemsOfStages) {
              const itemStage = itemOfPackage.items;
              for (const itemOfStage of itemStage) {
                items.push({
                  serviceId: findServiceIdOfFacilityService(itemOfStage.facilityServiceId),
                  quantity: itemOfStage.includedQuantity * item.quantity,
                  facilityId: maternityPackage.facilityId,
                  patientId: order.customerId,
                  pregnancyProfileId: order.pregnancyProfileId,
                });
              }
            }
          }
        }
      }
    }
  }
  // xếp lại các service theo các thai phụ
  type GroupedItem = {
    pregnancyProfileId: string;
    facilityId: string;
    patientId: string;
    services: Map<string, number>;
  };

  const groupedMap = items.reduce((result, item) => {
    const compositeKey = [item.pregnancyProfileId, item.facilityId, item.patientId].join('|');

    if (!result.has(compositeKey)) {
      result.set(compositeKey, {
        pregnancyProfileId: item.pregnancyProfileId,
        facilityId: item.facilityId,
        patientId: item.patientId,
        services: new Map<string, number>(),
      });
    }

    const group = result.get(compositeKey)!;

    const currentQuantity = group.services.get(item.serviceId as string) ?? 0;

    group.services.set(item.serviceId as string, currentQuantity + item.quantity);

    return result;
  }, new Map<string, GroupedItem>());

  const groupedItems = Array.from(groupedMap.values()).map((group) => {
    const services = Array.from(group.services, ([serviceId, quantity]) => ({
      serviceId,
      quantity,
    }));

    return {
      pregnancyProfileId: group.pregnancyProfileId,
      facilityId: group.facilityId,
      patientId: group.patientId,

      // Số loại dịch vụ khác nhau
      totalServiceTypes: services.length,

      // Tổng số lượt dịch vụ
      totalQuantity: services.reduce((sum, service) => sum + service.quantity, 0),

      services,
    };
  });
  // sau khi group xong, tạo appointment
  const doctors = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.DOCTOR } },
  });
  const staffs = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.STAFF } },
  });
  const rooms = await roomRepository.find();
  const pregnancyProfiles = await pregnancyProfileRepository.find();
  const facilities = await facilityRepository.find();
  // lấy các shift của doctors
  const shifts = await shiftRepository.find({
    relations: { staff: { roles: true } },
    where: { staff: { roles: { name: RoleEnum.DOCTOR } } },
  });
  const roomOfFacility = [];
  const doctorOfFacility = [];
  const staffOfFacility = [];
  const shiftOfFacility = [];
  for (const faci of facilities) {
    roomOfFacility[Number(faci.id)] = rooms.filter((room) => room.facilityId === faci.id);
    doctorOfFacility[Number(faci.id)] = doctors.filter((doctor) => doctor.facilityId === faci.id);
    staffOfFacility[Number(faci.id)] = staffs.filter((staff) => staff.facilityId === faci.id);
    shiftOfFacility[Number(faci.id)] = shifts.filter((shift) => shift.facilityId === faci.id);
  }
  const toMysqlDateTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
  const appointmentData = [];
  for (const item of groupedItems) {
    const pregnancyProfile = pregnancyProfiles.find(
      (profile) => profile.id === item.pregnancyProfileId,
    );
    if (!pregnancyProfile) {
      continue;
    }
    const numberAppoinment = item.totalQuantity;
    const facilityId = Number(item.facilityId);
    const rangeDay = Math.floor(270 / numberAppoinment);
    const serviceLength = item.services.length;
    for (let i = 0; i < serviceLength; i++) {
      for (let j = 0; j < item.services[i].quantity; j++) {
        const indexOfItem = i * serviceLength + j;
        const date = new Date(
          pregnancyProfile.createdAt.getTime() +
            (i * serviceLength + j) *
              (rangeDay - Math.floor(Math.random() * 5)) *
              24 *
              60 *
              60 *
              1000,
        );
        if (date > new Date(new Date().getTime() - 24 * 60 * 60 * 1000)) {
          break;
        }
        let shift = null;
        if (shiftOfFacility[facilityId].length === 0) {
          shift = null;
        } else {
          shift =
            shiftOfFacility[facilityId][
              Math.floor(Math.random() * shiftOfFacility[facilityId].length)
            ];
        }
        const doctorId =
          shift?.doctorId ??
          doctorOfFacility[facilityId][indexOfItem % doctorOfFacility[facilityId].length].id;
        const roomId =
          shift?.roomId ??
          roomOfFacility[facilityId][indexOfItem % roomOfFacility[facilityId].length].id;

        const randomHour = Math.floor(Math.random() * 12) + 8;
        const minute = indexOfItem % 2 === 0 ? 0 : 30;
        const scheduleDate = new Date(
          new Date(date).getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000,
        ).setHours(randomHour, minute, 0, 0);
        const status =
          new Date(scheduleDate).getTime() >= new Date().getTime()
            ? AppointmentStatus.BOOKED
            : AppointmentStatus.COMPLETED;

        appointmentData.push({
          pregnancyProfileId: item.pregnancyProfileId,
          patientId: item.patientId,
          facilityId: item.facilityId,
          roomId: roomId,
          doctorId: doctorId,
          scheduledStart: toMysqlDateTime(new Date(scheduleDate)),
          scheduledEnd: toMysqlDateTime(new Date(scheduleDate + 30 * 60 * 1000)),
          checkedInAt: toMysqlDateTime(new Date(new Date(scheduleDate).getTime() - 30 * 60 * 1000)),
          serviceId: item.services[i].serviceId,
          status: status,
          createdBy:
            staffOfFacility[facilityId][indexOfItem % staffOfFacility[facilityId].length].id,
          createdAt: new Date(date),
          updatedAt: new Date(date),
        });
      }
    }
  }
  const sortedAppointments = appointmentData.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateA.getTime() - dateB.getTime();
  });
  await appointmentRepository.save(sortedAppointments, {
    chunk: 100,
  });
}

async function insertMedicalRecords(): Promise<void> {
  const medicalRecordContents = [
    {
      diagnosis:
        'Thai kỳ đang tiến triển phù hợp với tuổi thai, chưa ghi nhận dấu hiệu bất thường.',
      conclusion: 'Sức khỏe thai phụ ổn định, thai nhi phát triển phù hợp với tuổi thai.',
      recommendation:
        'Tiếp tục theo dõi thai kỳ, bổ sung dinh dưỡng hợp lý và tái khám đúng lịch hẹn.',
    },
    {
      diagnosis:
        'Thai trong tử cung, tim thai rõ, các chỉ số phát triển hiện tại nằm trong giới hạn phù hợp.',
      conclusion: 'Thai nhi phát triển ổn định, chưa phát hiện bất thường tại thời điểm thăm khám.',
      recommendation:
        'Duy trì chế độ nghỉ ngơi hợp lý, theo dõi các dấu hiệu bất thường và khám lại theo lịch.',
    },
    {
      diagnosis:
        'Thai phụ có biểu hiện mệt mỏi nhẹ trong thai kỳ, chưa ghi nhận dấu hiệu nguy hiểm.',
      conclusion:
        'Tình trạng sức khỏe hiện tại ổn định, cần tiếp tục theo dõi và điều chỉnh sinh hoạt.',
      recommendation:
        'Nghỉ ngơi đầy đủ, uống đủ nước, ăn uống cân đối và thực hiện xét nghiệm theo chỉ định.',
    },
    {
      diagnosis:
        'Kết quả siêu âm cho thấy thai nhi có các chỉ số phát triển phù hợp với tuổi thai.',
      conclusion: 'Chưa ghi nhận bất thường hình thái thai nhi tại thời điểm siêu âm.',
      recommendation:
        'Tiếp tục khám thai định kỳ và thực hiện siêu âm hình thái theo mốc thai kỳ được hướng dẫn.',
    },
    {
      diagnosis:
        'Kết quả đo độ mờ da gáy nằm trong giới hạn theo dõi, chưa ghi nhận dấu hiệu bất thường rõ ràng.',
      conclusion:
        'Kết quả siêu âm hiện tại phù hợp, cần kết hợp với xét nghiệm sàng lọc để đánh giá đầy đủ.',
      recommendation:
        'Thực hiện xét nghiệm sàng lọc trước sinh theo tư vấn của bác sĩ và tái khám đúng lịch.',
    },
    {
      diagnosis: 'Kết quả xét nghiệm công thức máu ghi nhận chỉ số huyết sắc tố giảm nhẹ.',
      conclusion: 'Theo dõi tình trạng thiếu máu nhẹ trong thai kỳ.',
      recommendation:
        'Tăng cường thực phẩm giàu sắt và sử dụng thuốc bổ sung theo chỉ định của bác sĩ.',
    },
    {
      diagnosis: 'Kết quả xét nghiệm nước tiểu chưa ghi nhận bất thường đáng chú ý.',
      conclusion: 'Các chỉ số xét nghiệm nước tiểu hiện tại trong giới hạn theo dõi.',
      recommendation: 'Uống đủ nước, giữ vệ sinh cá nhân và tái kiểm tra theo lịch khám thai.',
    },
    {
      diagnosis: 'Kết quả đường huyết cao hơn ngưỡng theo dõi thông thường trong thai kỳ.',
      conclusion: 'Có nguy cơ rối loạn dung nạp glucose, cần thực hiện đánh giá bổ sung.',
      recommendation:
        'Thực hiện nghiệm pháp dung nạp glucose và điều chỉnh chế độ ăn theo hướng dẫn chuyên môn.',
    },
    {
      diagnosis: 'Kết quả nghiệm pháp dung nạp glucose cần được tiếp tục theo dõi.',
      conclusion: 'Thai phụ thuộc nhóm cần kiểm soát đường huyết trong thai kỳ.',
      recommendation:
        'Theo dõi đường huyết, điều chỉnh chế độ dinh dưỡng và tái khám theo lịch của bác sĩ.',
    },
    {
      diagnosis: 'Huyết áp thai phụ cao hơn mức theo dõi tại thời điểm thăm khám.',
      conclusion: 'Cần tiếp tục giám sát huyết áp và đánh giá nguy cơ liên quan trong thai kỳ.',
      recommendation:
        'Theo dõi huyết áp thường xuyên, nghỉ ngơi hợp lý và tái khám sớm nếu xuất hiện dấu hiệu bất thường.',
    },
    {
      diagnosis: 'Kết quả theo dõi tim thai ghi nhận nhịp tim thai trong giới hạn phù hợp.',
      conclusion: 'Tim thai ổn định tại thời điểm kiểm tra.',
      recommendation:
        'Tiếp tục theo dõi cử động thai và thực hiện kiểm tra tim thai theo lịch hẹn.',
    },
    {
      diagnosis:
        'Kết quả siêu âm Doppler ghi nhận tuần hoàn thai nhi hiện tại trong giới hạn theo dõi.',
      conclusion: 'Chưa phát hiện bất thường rõ ràng về tuần hoàn thai nhi tại thời điểm kiểm tra.',
      recommendation: 'Tiếp tục theo dõi sự phát triển của thai nhi và tái siêu âm theo chỉ định.',
    },
    {
      diagnosis: 'Thai phụ tăng cân nhanh hơn mức dự kiến trong giai đoạn hiện tại của thai kỳ.',
      conclusion: 'Cần điều chỉnh chế độ dinh dưỡng và tiếp tục theo dõi cân nặng.',
      recommendation:
        'Thực hiện chế độ ăn cân đối, hạn chế thực phẩm nhiều đường và vận động nhẹ phù hợp theo hướng dẫn.',
    },
    {
      diagnosis: 'Thai phụ có tiền sử sản khoa cần được theo dõi chặt chẽ trong thai kỳ hiện tại.',
      conclusion: 'Thai kỳ thuộc nhóm nguy cơ cần quản lý và thăm khám thường xuyên.',
      recommendation:
        'Tuân thủ lịch khám chuyên khoa, thực hiện đầy đủ xét nghiệm và đến cơ sở y tế khi có dấu hiệu bất thường.',
    },
    {
      diagnosis:
        'Thai đôi trong tử cung, các thai hiện có hoạt động tim thai và chỉ số phát triển cần tiếp tục theo dõi.',
      conclusion: 'Đa thai thuộc nhóm thai kỳ cần được quản lý chuyên sâu.',
      recommendation:
        'Tăng tần suất khám thai theo chỉ định, theo dõi dinh dưỡng và thực hiện siêu âm định kỳ.',
    },
    {
      diagnosis:
        'Kết quả sàng lọc trước sinh thuộc nhóm nguy cơ thấp đối với các bất thường được khảo sát.',
      conclusion: 'Chưa ghi nhận nguy cơ cao từ kết quả sàng lọc hiện tại.',
      recommendation:
        'Tiếp tục thực hiện các mốc khám và sàng lọc tiếp theo theo hướng dẫn của bác sĩ.',
    },
    {
      diagnosis:
        'Kết quả sàng lọc cần được bác sĩ chuyên khoa đánh giá thêm trước khi đưa ra kết luận.',
      conclusion: 'Chưa đủ cơ sở để kết luận, cần thực hiện tư vấn và kiểm tra bổ sung.',
      recommendation: 'Đăng ký tư vấn chuyên khoa và thực hiện xét nghiệm bổ sung theo chỉ định.',
    },
    {
      diagnosis: 'Sức khỏe thai phụ và thai nhi ổn định',
      conclusion: 'Thai kỳ đang tiến triển ổn định',
      recommendation:
        'Chuẩn bị hồ sơ sinh, theo dõi cử động thai và đến cơ sở y tế khi xuất hiện dấu hiệu chuyển dạ.',
    },
  ];
  const staffs = await staffRepository.find();
  const facilities = await facilityRepository.find();
  const staffOfFacility: Staff[][] = [];
  for (const faci of facilities) {
    staffOfFacility[Number(faci.id)] = staffs.filter((staff) => staff.facilityId === faci.id);
  }
  const appointments = await appointmentRepository.find();
  for (const appointment of appointments) {
    const randomContent =
      medicalRecordContents[Math.floor(Math.random() * medicalRecordContents.length)];
    const medicalRecord: DeepPartial<MedicalRecord> = {
      appointmentId: appointment.id,
      pregnancyProfileId: appointment.pregnancyProfileId as string,
      doctorId: appointment.doctorId,
      diagnosis: randomContent.diagnosis,
      conclusion: randomContent.conclusion,
      recommendation: randomContent.recommendation,
      createdAt: appointment.scheduledStart,
      updatedAt: appointment.scheduledStart,
    };
    const savedMedicalRecord = await medicalRecordRepository.save(medicalRecord);
    const medicalFileData = [
      {
        fileType: 'clinical_report',
        fileName: 'Phieu_kham_thai_MS_51_BV2_da_dien_mau.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'clinical_report',
        fileName: 'Phieu_kham_thai_dinh_ky.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'ultrasound_image',
        fileName: 'Hinh_anh_sieu_am_thai_2D.jpg',
        fileUrl: 'https://medlatec.vn/media/16696/content/20200107_Sieu-am-2D-1.jpg',
        mimeType: 'image/jpg',
      },
      {
        fileType: 'ultrasound_image',
        fileName: 'Hinh_anh_sieu_am_thai_4D.png',
        fileUrl:
          'https://drtuyhocbaothai.com/wp-content/uploads/2026/06/hinh-anh-sieu-am-4d-thai-nhi-luu-ky-niem.jpg.jpg',
        mimeType: 'image/jpg',
      },
      {
        fileType: 'ultrasound_report',
        fileName: 'Ket_qua_sieu_am_do_do_mo_da_gay.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'ultrasound_report',
        fileName: 'Ket_qua_sieu_am_hinh_thai_thai_nhi.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'laboratory_report',
        fileName: 'Ket_qua_xet_nghiem_cong_thuc_mau.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'laboratory_report',
        fileName: 'Ket_qua_xet_nghiem_nuoc_tieu.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'laboratory_report',
        fileName: 'Ket_qua_nghiem_phap_dung_nap_glucose.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'screening_report',
        fileName: 'Ket_qua_sang_loc_Double_Test.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
      {
        fileType: 'screening_report',
        fileName: 'Ket_qua_sang_loc_NIPT.pdf',
        fileUrl:
          'https://s3.vn-hcm-1.vietnix.cloud/maternity-care/medical-records/2/medical-record_9ae0cbafab.pdf',
        mimeType: 'application/pdf',
      },
    ];
    const fileData = [];
    const randomNumbers = Math.floor(Math.random() * 5) + 4;
    for (let i = 0; i < randomNumbers; i++) {
      const randomResult = Math.floor(Math.random() * medicalFileData.length);
      fileData.push(medicalFileData[randomResult]);
    }
    const medicalFiles = fileData.map((item) => ({
      ...item,
      medicalRecordId: savedMedicalRecord.id,
      uploadedBy:
        staffOfFacility[Number(appointment.facilityId)][
          Math.floor(Math.random() * staffOfFacility[Number(appointment.facilityId)].length)
        ].id,
      createdAt: new Date(savedMedicalRecord.createdAt),
      updatedAt: new Date(savedMedicalRecord.createdAt),
    }));
    await medicalFileRepository.save(medicalFiles);
  }
}

// async function insertCareFlowData(): Promise<void> {
//   const toMysqlDateTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
//   const users = await userRepository.find();
//   const profiles = await pregnancyProfileRepository.find();
//   const doctors = await staffRepository.find({
//     relations: { roles: true },
//     where: { roles: { name: RoleEnum.DOCTOR } },
//   });
//   const services = await serviceRepository.find();
//   const rooms = await roomRepository.find();
//   const shifts = await shiftRepository.find();
//   const packages = await maternityPackageRepository.find();

//   const appointments: Array<Partial<Appointment>> = [];
//   for (let index = 0; index < Math.min(users.length, 30); index++) {
//     const profile = profiles.find((item) => String(item.patientId) === String(users[index].id));
//     const shift = shifts[index % shifts.length];
//     const room =
//       rooms.find((item) => String(item.facilityId) === String(shift.facilityId)) ??
//       rooms[index % rooms.length];
//     const service = services[index % services.length];
//     const doctor = doctors[index % doctors.length];
//     const scheduledStart = new Date(`${shift.shiftDate}T${shift.startTime}`);
//     const scheduledEnd = new Date(
//       scheduledStart.getTime() + service.defaultDurationMinutes * 60 * 1000,
//     );

//     appointments.push({
//       shiftId: shift.id,
//       patientId: users[index].id,
//       pregnancyProfileId: profile?.id ?? null,
//       roomId: room.id,
//       facilityId: shift.facilityId,
//       doctorId: doctor.id,
//       serviceId: service.id,
//       scheduledStart: toMysqlDateTime(scheduledStart),
//       scheduledEnd: toMysqlDateTime(scheduledEnd),
//       checkedInAt: index % 5 === 0 ? scheduledStart : null,
//       status: index % 5 === 0 ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED,
//       createdBy: doctor.id,
//     });
//   }

//   const savedAppointments = await appointmentRepository.save(appointments);
//   await appointmentReminderRepository.save(
//     savedAppointments.map((appointment) => ({
//       appointmentId: appointment.id,
//       channel: 'email',
//       scheduledAt: new Date(
//         new Date(appointment.scheduledStart ?? new Date()).getTime() - 24 * 60 * 60 * 1000,
//       ),
//       sentAt: null,
//       status: ReminderStatus.PENDING,
//       errorMessage: null,
//     })),
//   );

//   for (let index = 0; index < Math.min(profiles.length, 25); index++) {
//     const profile = profiles[index];
//     const recorder = doctors[index % doctors.length];
//     await healthMetricRepository.save({
//       pregnancyProfileId: profile.id,
//       recordedBy: recorder.id,
//       gestationalAgeWeeks: 8 + (index % 28),
//       weightKg: 52 + (index % 12),
//       bloodPressureSystolic: 105 + (index % 18),
//       bloodPressureDiastolic: 65 + (index % 12),
//       heartRate: 72 + (index % 10),
//       bloodSugar: 4.8 + (index % 4) * 0.2,
//       fetalHeartRate: 130 + (index % 18),
//       metadata: { source: 'seed' },
//       notes: 'Chỉ số seed demo trong giới hạn theo dõi.',
//     });
//   }

//   const completedAppointments = savedAppointments.filter(
//     (item) => item.status === AppointmentStatus.COMPLETED,
//   );
//   await medicalRecordRepository.save(
//     completedAppointments.map((appointment) => ({
//       appointmentId: appointment.id,
//       pregnancyProfileId: appointment.pregnancyProfileId!,
//       doctorId: appointment.doctorId,
//       diagnosis: 'Thai kỳ tiến triển ổn định.',
//       conclusion: 'Không ghi nhận bất thường trong lần khám.',
//       recommendation: 'Tiếp tục theo dõi, ăn uống đủ chất và tái khám đúng hẹn.',
//       nextAppointmentSuggestedAt: new Date(
//         new Date(appointment.scheduledEnd ?? new Date()).getTime() + 28 * 24 * 60 * 60 * 1000,
//       ),
//     })),
//   );

//   for (let index = 0; index < Math.min(users.length, packages.length); index++) {
//     const user = users[index];
//     const profile = profiles.find((item) => String(item.patientId) === String(user.id));
//     const pkg = packages[index % packages.length];
//     const order = await orderRepository.save({
//       code: `ORD-SEED-${String(index + 1).padStart(4, '0')}`,
//       customerId: user.id,
//       pregnancyProfileId: profile?.id ?? profiles[0].id,
//       facilityId: pkg.facilityId,
//       orderType: OrderType.MATERNITY_PACKAGE,
//       subtotalAmount: Number(pkg.price),
//       discountAmount: 0,
//       totalAmount: Number(pkg.price),
//       status: OrderStatus.PAID,
//     });

//     await orderItemRepository.save({
//       orderId: order.id,
//       item: 'maternity_package' as never,
//       itemType: OrderItemType.PACKAGE,
//       itemId: pkg.id,
//       name: pkg.name,
//       quantity: 1,
//       unitPrice: pkg.price,
//       totalPrice: pkg.price,
//       metadata: { source: 'seed' },
//     } as never);

//     await paymentRepository.save({
//       orderId: order.id,
//       paymentMethod: 'cash',
//       provider: 'seed',
//       providerTransactionId: `PAY-SEED-${String(index + 1).padStart(4, '0')}`,
//       amount: Number(pkg.price),
//       status: PaymentStatus.SUCCESS,
//       paidAt: new Date(),
//       rawResponse: null,
//     });
//   }

//   const packageItems = await packageItemRepository.find({ relations: { facilityService: true } });
//   await patientPackageBenefitRepository.save(
//     users.slice(0, 10).flatMap((user, userIndex) =>
//       packageItems.slice(0, 3).map((item) => ({
//         userId: user.id,
//         serviceId: item.facilityService.serviceId,
//         totalQuantity: item.includedQuantity,
//         usedQuantity: userIndex % 2,
//         remainingQuantity: Math.max(item.includedQuantity - (userIndex % 2), 0),
//       })),
//     ),
//   );

//   await scheduleRepository.save(
//     savedAppointments.slice(0, 20).map((appointment) => ({
//       userId: appointment.patientId,
//       title: 'Lịch khám thai',
//       type: 'appointment',
//       scheduleDate: new Date(appointment.scheduledStart ?? new Date()).toISOString().slice(0, 10),
//       scheduleTime: new Date(appointment.scheduledStart ?? new Date()).toTimeString().slice(0, 8),
//       status: 'upcoming',
//       location: 'Maternity Care System',
//       doctor:
//         doctors.find((doctor) => String(doctor.id) === String(appointment.doctorId))?.name ?? null,
//       note: 'Lịch được tạo từ seed demo.',
//       source: 'appointment',
//       appointmentId: appointment.id,
//     })),
//   );
// }

async function insertForumData(): Promise<void> {
  const users = await userRepository.find();
  const doctors = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.DOCTOR } },
  });
  const admins = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: RoleEnum.ADMIN } },
  });

  await forumCategoryRepository.save([
    {
      code: ForumCategory.PREGNANCY,
      name: 'Thai kỳ',
      description: 'Trao đổi về quá trình mang thai',
      sortOrder: 1,
      status: ActiveStatus.ACTIVE,
    },
    {
      code: ForumCategory.NUTRITION,
      name: 'Dinh dưỡng',
      description: 'Chế độ ăn uống cho mẹ và bé',
      sortOrder: 2,
      status: ActiveStatus.ACTIVE,
    },
    {
      code: ForumCategory.ASK_DOCTOR,
      name: 'Hỏi bác sĩ',
      description: 'Câu hỏi cần bác sĩ tư vấn',
      sortOrder: 3,
      status: ActiveStatus.ACTIVE,
    },
  ]);

  await dataSource.query(
    `
    INSERT INTO forum_topics (author_id, title, slug, category, description, status, created_at, updated_at)
    VALUES
      (?, 'Theo dõi thai kỳ', 'theo-doi-thai-ky', ?, 'Kinh nghiệm theo dõi các mốc khám quan trọng', 'active', NOW(), NOW()),
      (?, 'Dinh dưỡng cho mẹ bầu', 'dinh-duong-cho-me-bau', ?, 'Chia sẻ thực đơn và lưu ý dinh dưỡng', 'active', NOW(), NOW())
    `,
    [admins[0].id, ForumCategory.PREGNANCY, admins[0].id, ForumCategory.NUTRITION],
  );
  const topics = await dataSource.query('SELECT id, category FROM forum_topics ORDER BY id ASC');

  const posts = await forumPostRepository.save([
    {
      forumTopicId: topics[0].id,
      author: users[0].name,
      authorId: users[0].id,
      authorRole: ForumAuthorRole.USER,
      title: 'Mốc khám thai đầu tiên nên chuẩn bị gì?',
      slug: 'moc-kham-thai-dau-tien-seed',
      category: ForumCategory.PREGNANCY,
      content:
        'Mình mới có hồ sơ thai kỳ, muốn hỏi lần khám đầu tiên nên chuẩn bị những giấy tờ gì?',
      coverImageUrl: null,
      commentable: true,
      isPinned: true,
      isFeatured: true,
      status: ForumContentStatus.PUBLISHED,
      approvedBy: admins[0].id,
      approvedAt: new Date(),
      moderatedBy: null,
      moderatedAt: null,
      moderationReason: null,
    },
    {
      forumTopicId: topics[1].id,
      author: users[1].name,
      authorId: users[1].id,
      authorRole: ForumAuthorRole.USER,
      title: 'Thực đơn nhẹ cho tam cá nguyệt đầu',
      slug: 'thuc-don-nhe-tam-ca-nguyet-dau-seed',
      category: ForumCategory.NUTRITION,
      content: 'Mọi người thường ăn gì khi bị nghén nhưng vẫn cần đủ năng lượng?',
      coverImageUrl: null,
      commentable: true,
      isPinned: false,
      isFeatured: true,
      status: ForumContentStatus.PUBLISHED,
      approvedBy: admins[0].id,
      approvedAt: new Date(),
      moderatedBy: null,
      moderatedAt: null,
      moderationReason: null,
    },
  ]);

  await forumCommentRepository.save(
    posts.map((post, index) => ({
      postId: post.id,
      author: doctors[index % doctors.length].name,
      authorId: doctors[index % doctors.length].id,
      authorRole: ForumAuthorRole.DOCTOR,
      parentId: null,
      messageType: 'text',
      content:
        'Bạn nên mang giấy tờ tùy thân, lịch sử khám nếu có và đặt câu hỏi cần tư vấn trước buổi khám.',
      isDoctorAnswer: true,
      status: ForumContentStatus.PUBLISHED,
      moderatedBy: null,
      moderatedAt: null,
      moderationReason: null,
    })),
  );
}

async function insertNotifications(): Promise<void> {
  const users = await userRepository.find();
  const staffs = await staffRepository.find();
  const appointments = await appointmentRepository.find();

  await notificationRepository.save([
    ...appointments.slice(0, 10).map((appointment) => ({
      reference: `appointment:${appointment.id}`,
      userId: appointment.patientId,
      staffId: appointment.doctorId,
      type: NotificationType.APPOINTMENT,
      title: 'Nhắc lịch khám',
      content: 'Bạn có lịch khám thai sắp tới. Vui lòng đến trước 15 phút.',
      isRead: false,
      referenceType: NotificationReferenceType.APPOINTMENT,
      referenceId: appointment.id,
    })),
    ...users.slice(0, 5).map((user, index) => ({
      reference: `system:user:${user.id}`,
      userId: user.id,
      staffId: staffs[index % staffs.length].id,
      type: NotificationType.SYSTEM,
      title: 'Chào mừng bạn đến với Maternity Care',
      content: 'Tài khoản demo đã sẵn sàng để bạn trải nghiệm hệ thống.',
      isRead: index % 2 === 0,
      referenceType: NotificationReferenceType.PREGNANCY_PROFILE,
      referenceId: user.id,
    })),
  ]);
}

async function printSeedSummary(): Promise<void> {
  const tables = [
    'roles',
    'permissions',
    'staffs',
    'doctors',
    'facilities',
    'rooms',
    'users',
    'pregnancy_profiles',
    'service_types',
    'services',
    'facility_services',
    'maternity_packages',
    'package_items',
    'shifts',
    'appointments',
    'orders',
    'payments',
    'forum_posts',
    'notifications',
    'settings',
  ];

  console.log('Seed summary:');
  for (const tableName of tables) {
    if (await tableExists(tableName)) {
      const rows = await dataSource.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
      console.log(`- ${tableName}: ${rows[0]?.count ?? 0}`);
    }
  }
}

async function seedCustomData(): Promise<void> {
  try {
    dataSource.setOptions({ logging: false });
    await dataSource.initialize();
    console.log('Kết nối với database thành công.');

    // if (shouldFreshSeed) {
    //   await clearSeedData();
    // }

    // await insertPermission();
    // await insertRoles();
    // await insertRolePermission();
    // await insertStaffs();
    // await insertDoctor();
    // await insertFacility();
    // await insertRoomTypes();
    // await insertRooms();
    // await insertSettings();
    // await insertServiceCatalog();
    // await insertMaternityPackages();
    // await insertFaqs();
    // await insertArticles();
    // await insertUsers();
    // await insertPregnancyProfiles();
    // await insertUserAuths();
    // await insertShiftSlots();
    await insertShifts();
    // await insertOrders();
    // await insertAppointments();
    // await insertMedicalRecords();
    // // await insertCareFlowData();
    // await insertForumData();
    // await insertNotifications();
    // await printSeedSummary();

    console.log('Tất cả dữ liệu đã được chèn thành công!');
  } catch (error: unknown) {
    console.error('Lỗi khi chèn dữ liệu:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Đã đóng kết nối database.');
    }
  }
}

void seedCustomData();
