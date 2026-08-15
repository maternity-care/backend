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
} from '../entities';
import { MaternityPackageStageType, MaternityPackageType } from '../../modules/maternity-packages/dto/requests/create-maternity-package.dto';
import { PackageServiceFacilityScope } from '../../modules/package-services/dto/requests/create-package-service.dto';
import { ServiceSaleMode } from '../../modules/services/dto/requests/create-service.dto';
import { ForumAuthorRole, ForumCategory } from '../../common/constants/forum.enum';
import { NotificationReferenceType, NotificationType } from '../../common/constants/notification.enum';
import { PackageServiceFacility } from '../../modules/package-services/entities/package-service-facility.entity';
import { PackageStage } from '../../modules/maternity-packages/entities/package-stage.entity';
import { OrderType } from '../../modules/payment/entities/order.entity';
import { OrderItemType } from '../../modules/payment/entities/order-item.entity';
import { ServiceType } from '../../modules/service-types/entities/service-type.entity';
import { Setting } from '../../modules/settings/entities/setting.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { UserSchedule } from '../../modules/schedules/entities/user-schedule.entity';
import * as bcrypt from 'bcrypt';
import { Not, In } from 'typeorm';

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
    { role: RoleEnum.DOCTOR, quantity: 20 },
    { role: RoleEnum.NURSE, quantity: 20 },
    { role: RoleEnum.STAFF, quantity: 20 },
    { role: RoleEnum.MEMBER, quantity: 20 },
    { role: RoleEnum.PARTNER, quantity: 20 },
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

  const roles = roleQuantities.flatMap(({ role, quantity }) => Array<RoleEnum>(quantity).fill(role));
  const roleCounters = new Map<RoleEnum, number>();

  const baseData = names.map((name, index) => {
    const roleName = roles[index];
    const roleSequence = (roleCounters.get(roleName) ?? 0) + 1;
    roleCounters.set(roleName, roleSequence);

    return {
      name: roleName === RoleEnum.SUPER_ADMIN && roleSequence === 1 ? 'Super Admin' : name,
      personalEmail: generateEmail(name, index),
      loginEmail: roleName === RoleEnum.SUPER_ADMIN && roleSequence === 1 ? `superadmin@${EMAIL_DOMAIN}` : undefined,
      // Tạo các số điện thoại mẫu từ 0985000001 đến 0985000110
      phoneNumber: `0985${String(index + 1).padStart(5, '0')}`,
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

  const titleList = [
    { title: 'Bác sĩ', year: 5 },
    { title: 'Bác sĩ Chuyên khoa I', year: 8 },
    { title: 'Bác sĩ Chuyên khoa II', year: 10 },
    { title: 'Thạc sĩ, Bác sĩ', year: 15 },
    { title: 'Tiến sĩ, Bác sĩ', year: 20 },
    { title: 'Phó giáo sư, Tiến sĩ, Bác sĩ', year: 25 },
    { title: 'Giáo sư, Tiến sĩ, Bác sĩ', year: 30 },
  ];

  const doctors = staffs.map((staff, index) => {
    const title = titleList[index % titleList.length];
    const yearEx = Math.floor(Math.random() * 5) + title.year;
    return {
      staffId: staff.id,
      licenseNo: `CCHN-OBGYN-2601${index + 10}`,
      title: title.title,
      specialty: 'Sản phụ khoa',
      yearsOfExperience: yearEx,
      bio: `${title.title} ${staff.name} có ${yearEx} kinh nghiệm trong lĩnh vực sản phụ khoa, tận tâm tư vấn, thăm khám và đồng hành cùng mẹ bầu trong suốt thai kỳ, hướng đến sự an toàn và chăm sóc phù hợp cho mẹ và bé.`,
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
  const buildFacilityStaffEmail = (staff: Staff, facility: Facility) => {
    const currentLocalPart = String(staff.email).split('@')[0] || toLoginEmailLocalPart(staff.name);
    const baseLocalPart = currentLocalPart.replace(/\.cs-[a-z0-9-]+$/i, '');
    const facilityLocalPart = toLoginEmailLocalPart(facility.code);

    return `${baseLocalPart}.${facilityLocalPart}@${EMAIL_DOMAIN}`;
  };

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
    const facility = facilities.find((f) => f.ownerId === admin.id) || facilities[index % facilities.length];
    admin.facilityId = facility.id;
    admin.email = buildFacilityStaffEmail(admin, facility);
  });
  await staffRepository.save(admins);
  const staffs = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: Not(In([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN])) } },
  });

  staffs.forEach((staff, index) => {
    const facility = facilities[index % facilities.length];
    staff.facilityId = facility.id;
    staff.email = buildFacilityStaffEmail(staff, facility);
  });
  await staffRepository.save(staffs);
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
    const floorCount = facilities[index].floorCount ?? 1;
    for (let floor = 1; floor <= floorCount; floor++) {
      const roomCount = Math.floor(Math.random() * 5) + 5;
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
    data.push(pregnancyProfileData);

    if (
      // Nếu người dùng đã được tạo hơn 2 năm trước và chưa quá 1 ngày trước, tạo thêm một hồ sơ thai kỳ khác
      new Date(user.createdAt).getTime() + 2 * 365 * 24 * 60 * 60 * 1000 <
      new Date().getTime() - 1 * 24 * 60 * 60 * 1000
    ) {
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
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.createdAt),
        createdBy: staffs[Math.floor(Math.random() * staffs.length)].id,
      };
      data.push(pregnancyProfileData2);
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
    { key: 'site.description', value: 'Hệ thống quản lý chăm sóc thai sản', group: 'general', isPublic: 1 },
    { key: 'contact.email', value: 'support@mcs.com.vn', group: 'contact', isPublic: 1 },
    { key: 'contact.phone', value: '02473010000', group: 'contact', isPublic: 1 },
    { key: 'appointment.reminder_hours', value: 24, group: 'appointment', isPublic: 0 },
    { key: 'upload.max_file_size_mb', value: 10, group: 'upload', isPublic: 0 },
  ]);
}

async function insertServiceCatalog(): Promise<void> {
  const serviceTypes = await serviceTypeRepository.save([
    { code: 'CONSULT', name: 'Khám và tư vấn', description: 'Các dịch vụ khám, tư vấn thai sản', status: ActiveStatus.ACTIVE },
    { code: 'ULTRASOUND', name: 'Siêu âm', description: 'Siêu âm thai theo từng mốc thai kỳ', status: ActiveStatus.ACTIVE },
    { code: 'TEST', name: 'Xét nghiệm', description: 'Xét nghiệm máu, nước tiểu và tầm soát', status: ActiveStatus.ACTIVE },
    { code: 'CARE', name: 'Chăm sóc sau sinh', description: 'Theo dõi và tư vấn sau sinh', status: ActiveStatus.ACTIVE },
  ]);

  const typeByCode = new Map(serviceTypes.map((type) => [type.code, type]));
  const services = await serviceRepository.save([
    {
      code: 'CONSULT-OB-001',
      name: 'Khám thai định kỳ',
      description: 'Khám thai, đo chỉ số cơ bản và tư vấn theo tuần thai.',
      serviceTypeId: typeByCode.get('CONSULT')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '250000',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'US-2D-001',
      name: 'Siêu âm thai 2D',
      description: 'Siêu âm kiểm tra sự phát triển của thai nhi.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 20,
      basePrice: '300000',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'US-4D-001',
      name: 'Siêu âm thai 4D',
      description: 'Siêu âm hình thái thai nhi theo mốc thai kỳ.',
      serviceTypeId: typeByCode.get('ULTRASOUND')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '650000',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'TEST-BLOOD-001',
      name: 'Xét nghiệm máu thai kỳ',
      description: 'Xét nghiệm các chỉ số máu thường quy cho mẹ bầu.',
      serviceTypeId: typeByCode.get('TEST')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 15,
      basePrice: '450000',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
    {
      code: 'CARE-POST-001',
      name: 'Tư vấn chăm sóc sau sinh',
      description: 'Tư vấn phục hồi sau sinh và chăm sóc em bé.',
      serviceTypeId: typeByCode.get('CARE')!.id,
      saleMode: ServiceSaleMode.BOTH,
      defaultDurationMinutes: 30,
      basePrice: '350000',
      requiresDoctorWarning: false,
      status: ActiveStatus.ACTIVE,
    },
  ]);

  const facilities = await facilityRepository.find();
  const facilityServices = facilities.flatMap((facility, facilityIndex) =>
    services.map((service, serviceIndex) => ({
      facilityId: facility.id,
      serviceId: service.id,
      price: String(Number(service.basePrice) + facilityIndex * 25000 + serviceIndex * 10000),
      durationMinutes: service.defaultDurationMinutes,
      status: ActiveStatus.ACTIVE,
    })),
  );

  await facilityServiceRepository.save(facilityServices);
}

async function insertMaternityPackages(): Promise<void> {
  const facilities = await facilityRepository.find();
  const facilityServices = await facilityServiceRepository.find();

  for (const facility of facilities) {
    const servicesForFacility = facilityServices.filter((item) => String(item.facilityId) === String(facility.id));
    const pkg = await maternityPackageRepository.save({
      facilityId: facility.id,
      code: `PKG-${facility.code.replace(/^CS-/, '')}-BASIC`,
      name: `Gói thai sản cơ bản - ${facility.name}`,
      description: 'Gói theo dõi thai kỳ gồm khám, siêu âm và xét nghiệm cơ bản.',
      packageType: MaternityPackageType.SCHEDULE,
      price: '3500000',
      durationDays: 280,
      priorityLevel: 1,
      status: MaternityPackageStatus.ACTIVE,
    });

    const stages = await packageStageRepository.save([
      {
        packageId: pkg.id,
        name: 'Tam cá nguyệt 1',
        stageType: MaternityPackageStageType.PREGNANCY_WEEK,
        weekFrom: 6,
        weekTo: 13,
        goal: 'Xác nhận thai, đánh giá sức khỏe ban đầu và tư vấn chăm sóc.',
        sortOrder: 1,
      },
      {
        packageId: pkg.id,
        name: 'Tam cá nguyệt 2',
        stageType: MaternityPackageStageType.PREGNANCY_WEEK,
        weekFrom: 14,
        weekTo: 27,
        goal: 'Theo dõi phát triển thai nhi và tầm soát các chỉ số quan trọng.',
        sortOrder: 2,
      },
      {
        packageId: pkg.id,
        name: 'Tam cá nguyệt 3',
        stageType: MaternityPackageStageType.PREGNANCY_WEEK,
        weekFrom: 28,
        weekTo: 40,
        goal: 'Chuẩn bị sinh, theo dõi sát sức khỏe mẹ và bé.',
        sortOrder: 3,
      },
    ]);

    const savedItems = [];
    for (let index = 0; index < servicesForFacility.slice(0, 4).length; index++) {
      const facilityService = servicesForFacility[index];
      const item = await packageItemRepository.save({
        packageId: pkg.id,
        facilityServiceId: facilityService.id,
        packageStageId: stages[index % stages.length].id,
        includedQuantity: index === 0 ? 6 : 2,
        isRequired: true,
        isOptional: false,
        allowedFacilityScope: PackageServiceFacilityScope.SELECTED,
        sortOrder: index + 1,
      });
      savedItems.push(item);
    }

    await packageServiceFacilityRepository.save(
      savedItems.map((item) => ({ packageItemId: item.id, facilityId: facility.id })),
    );
  }
}

async function insertShifts() {
  const staffs = await staffRepository.find({
    relations: { roles: true },
    where: { roles: { name: In([RoleEnum.DOCTOR, RoleEnum.NURSE, RoleEnum.STAFF]) } },
  });
  const shiftSlots = await shiftSlotRepository.find();
  const rooms = await roomRepository.find();
  const today = new Date();

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const shiftDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    for (let staffIndex = 0; staffIndex < staffs.length; staffIndex++) {
      const staff = staffs[staffIndex];
      const staffSlots = shiftSlots.filter((slot) => String(slot.facilityId) === String(staff.facilityId));
      const slot = staffSlots[(dayOffset + staffIndex) % staffSlots.length];
      const room = rooms.find((item) => String(item.facilityId) === String(staff.facilityId));

      if (slot) {
        const newShift = {
          staffId: staff.id,
          roleId: staff.roles[0]?.id ?? null,
          facilityId: staff.facilityId!,
          roomId: room?.id ?? null,
          slotId: slot.id,
          shiftDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxAppointments: 8,
          status: DoctorShiftStatus.AVAILABLE,
          note: 'Ca làm việc seed demo',
        };
        await shiftRepository.save(newShift);
      }
    }
  }
}

async function insertCareFlowData(): Promise<void> {
  const toMysqlDateTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
  const users = await userRepository.find();
  const profiles = await pregnancyProfileRepository.find();
  const doctors = await staffRepository.find({ relations: { roles: true }, where: { roles: { name: RoleEnum.DOCTOR } } });
  const services = await serviceRepository.find();
  const rooms = await roomRepository.find();
  const shifts = await shiftRepository.find();
  const packages = await maternityPackageRepository.find();

  const appointments: Array<Partial<Appointment>> = [];
  for (let index = 0; index < Math.min(users.length, 30); index++) {
    const profile = profiles.find((item) => String(item.patientId) === String(users[index].id));
    const shift = shifts[index % shifts.length];
    const room = rooms.find((item) => String(item.facilityId) === String(shift.facilityId)) ?? rooms[index % rooms.length];
    const service = services[index % services.length];
    const doctor = doctors[index % doctors.length];
    const scheduledStart = new Date(`${shift.shiftDate}T${shift.startTime}`);
    const scheduledEnd = new Date(scheduledStart.getTime() + service.defaultDurationMinutes * 60 * 1000);

    appointments.push({
      shiftId: shift.id,
      patientId: users[index].id,
      pregnancyProfileId: profile?.id ?? null,
      roomId: room.id,
      facilityId: shift.facilityId,
      doctorId: doctor.id,
      serviceId: service.id,
      scheduledStart: toMysqlDateTime(scheduledStart),
      scheduledEnd: toMysqlDateTime(scheduledEnd),
      checkedInAt: index % 5 === 0 ? scheduledStart : null,
      status: index % 5 === 0 ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED,
      createdBy: doctor.id,
    });
  }

  const savedAppointments = await appointmentRepository.save(appointments);
  await appointmentReminderRepository.save(
    savedAppointments.map((appointment) => ({
      appointmentId: appointment.id,
      channel: 'email',
      scheduledAt: new Date(new Date(appointment.scheduledStart ?? new Date()).getTime() - 24 * 60 * 60 * 1000),
      sentAt: null,
      status: ReminderStatus.PENDING,
      errorMessage: null,
    })),
  );

  for (let index = 0; index < Math.min(profiles.length, 25); index++) {
    const profile = profiles[index];
    const recorder = doctors[index % doctors.length];
    await healthMetricRepository.save({
      pregnancyProfileId: profile.id,
      recordedBy: recorder.id,
      gestationalAgeWeeks: 8 + (index % 28),
      weightKg: 52 + (index % 12),
      bloodPressureSystolic: 105 + (index % 18),
      bloodPressureDiastolic: 65 + (index % 12),
      heartRate: 72 + (index % 10),
      bloodSugar: 4.8 + (index % 4) * 0.2,
      fetalHeartRate: 130 + (index % 18),
      metadata: { source: 'seed' },
      notes: 'Chỉ số seed demo trong giới hạn theo dõi.',
    });
  }

  const completedAppointments = savedAppointments.filter((item) => item.status === AppointmentStatus.COMPLETED);
  await medicalRecordRepository.save(
    completedAppointments.map((appointment) => ({
      appointmentId: appointment.id,
      pregnancyProfileId: appointment.pregnancyProfileId!,
      doctorId: appointment.doctorId,
      diagnosis: 'Thai kỳ tiến triển ổn định.',
      conclusion: 'Không ghi nhận bất thường trong lần khám.',
      recommendation: 'Tiếp tục theo dõi, ăn uống đủ chất và tái khám đúng hẹn.',
      nextAppointmentSuggestedAt: new Date(new Date(appointment.scheduledEnd ?? new Date()).getTime() + 28 * 24 * 60 * 60 * 1000),
    })),
  );

  for (let index = 0; index < Math.min(users.length, packages.length); index++) {
    const user = users[index];
    const profile = profiles.find((item) => String(item.patientId) === String(user.id));
    const pkg = packages[index % packages.length];
    const order = await orderRepository.save({
      code: `ORD-SEED-${String(index + 1).padStart(4, '0')}`,
      customerId: user.id,
      pregnancyProfileId: profile?.id ?? profiles[0].id,
      facilityId: pkg.facilityId,
      orderType: OrderType.MATERNITY_PACKAGE,
      subtotalAmount: Number(pkg.price),
      discountAmount: 0,
      totalAmount: Number(pkg.price),
      status: OrderStatus.PAID,
    });

    await orderItemRepository.save({
      orderId: order.id,
      item: 'maternity_package' as never,
      itemType: OrderItemType.PACKAGE,
      itemId: pkg.id,
      name: pkg.name,
      quantity: 1,
      unitPrice: pkg.price,
      totalPrice: pkg.price,
      metadata: { source: 'seed' },
    } as never);

    await paymentRepository.save({
      orderId: order.id,
      paymentMethod: 'cash',
      provider: 'seed',
      providerTransactionId: `PAY-SEED-${String(index + 1).padStart(4, '0')}`,
      amount: Number(pkg.price),
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
      rawResponse: null,
    });
  }

  const packageItems = await packageItemRepository.find({ relations: { facilityService: true } });
  await patientPackageBenefitRepository.save(
    users.slice(0, 10).flatMap((user, userIndex) =>
      packageItems.slice(0, 3).map((item) => ({
        userId: user.id,
        serviceId: item.facilityService.serviceId,
        totalQuantity: item.includedQuantity,
        usedQuantity: userIndex % 2,
        remainingQuantity: Math.max(item.includedQuantity - (userIndex % 2), 0),
      })),
    ),
  );

  await scheduleRepository.save(
    savedAppointments.slice(0, 20).map((appointment) => ({
      userId: appointment.patientId,
      title: 'Lịch khám thai',
      type: 'appointment',
      scheduleDate: new Date(appointment.scheduledStart ?? new Date()).toISOString().slice(0, 10),
      scheduleTime: new Date(appointment.scheduledStart ?? new Date()).toTimeString().slice(0, 8),
      status: 'upcoming',
      location: 'Maternity Care System',
      doctor: doctors.find((doctor) => String(doctor.id) === String(appointment.doctorId))?.name ?? null,
      note: 'Lịch được tạo từ seed demo.',
      source: 'appointment',
      appointmentId: appointment.id,
    })),
  );
}

async function insertForumData(): Promise<void> {
  const users = await userRepository.find();
  const doctors = await staffRepository.find({ relations: { roles: true }, where: { roles: { name: RoleEnum.DOCTOR } } });
  const admins = await staffRepository.find({ relations: { roles: true }, where: { roles: { name: RoleEnum.ADMIN } } });

  await forumCategoryRepository.save([
    { code: ForumCategory.PREGNANCY, name: 'Thai kỳ', description: 'Trao đổi về quá trình mang thai', sortOrder: 1, status: ActiveStatus.ACTIVE },
    { code: ForumCategory.NUTRITION, name: 'Dinh dưỡng', description: 'Chế độ ăn uống cho mẹ và bé', sortOrder: 2, status: ActiveStatus.ACTIVE },
    { code: ForumCategory.ASK_DOCTOR, name: 'Hỏi bác sĩ', description: 'Câu hỏi cần bác sĩ tư vấn', sortOrder: 3, status: ActiveStatus.ACTIVE },
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
      content: 'Mình mới có hồ sơ thai kỳ, muốn hỏi lần khám đầu tiên nên chuẩn bị những giấy tờ gì?',
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
      content: 'Bạn nên mang giấy tờ tùy thân, lịch sử khám nếu có và đặt câu hỏi cần tư vấn trước buổi khám.',
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

    if (shouldFreshSeed) {
      await clearSeedData();
    }

    await insertPermission();
    await insertRoles();
    await insertRolePermission();
    await insertStaffs();
    await insertDoctor();
    await insertFacility();
    await insertRoomTypes();
    await insertRooms();
    await insertSettings();
    await insertServiceCatalog();
    await insertMaternityPackages();
    await insertFaqs();
    await insertArticles();
    await insertUsers();
    await insertPregnancyProfiles();
    await insertUserAuths();
    await insertShiftSlots();
    await insertShifts();
    await insertCareFlowData();
    await insertForumData();
    await insertNotifications();
    await printSeedSummary();

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
