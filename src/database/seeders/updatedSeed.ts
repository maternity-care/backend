/**
 * Seed data cho NestJS + TypeORM + MariaDB.
 *
 * - Bao phủ 51 bảng trong ERD, mỗi bảng 5 bản ghi.
 * - Dùng ID cố định 900xxx và ON DUPLICATE KEY UPDATE nên có thể chạy lại.
 * - Mật khẩu mặc định lấy từ SEED_PASSWORD, fallback: Password@123.
 * - Hãy đối chiếu các chuỗi status/type với enum thực tế trước khi chạy lần đầu.
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryRunner, Table } from 'typeorm';
import dataSource from '../typeorm.config';

type SeedValue = string | number | boolean | Date | null | Record<string, unknown>;
type SeedRow = Record<string, SeedValue>;

interface TableSeed {
  /** Tên đầu tiên là tên theo ERD; các tên sau là alias tương thích. */
  names: string[];
  rows: SeedRow[];
}

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password@123';
const SEED_COUNT = 5;

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

async function resolveTable(queryRunner: QueryRunner, candidates: string[]): Promise<Table> {
  for (const candidate of candidates) {
    const table = await queryRunner.getTable(candidate);
    if (table) return table;
  }
  throw new Error(`Không tìm thấy bảng: ${candidates.join(' hoặc ')}`);
}

function normalizeValue(value: SeedValue): SeedValue | string {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
}

async function upsertRows(queryRunner: QueryRunner, spec: TableSeed): Promise<void> {
  const table = await resolveTable(queryRunner, spec.names);
  const actualColumns = new Set(table.columns.map((column) => column.name));

  for (const originalRow of spec.rows) {
    const row = Object.fromEntries(
      Object.entries(originalRow)
        .filter(([column]) => actualColumns.has(column))
        .map(([column, value]) => [column, normalizeValue(value)]),
    );
    const columns = Object.keys(row);
    if (!columns.includes('id')) {
      throw new Error(`Seed của bảng ${table.name} thiếu cột id`);
    }

    const columnSql = columns.map(quoteIdentifier).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const updateColumns = columns.filter((column) => column !== 'id');
    const updateSql = updateColumns
      .map((column) => `${quoteIdentifier(column)} = VALUES(${quoteIdentifier(column)})`)
      .join(', ');

    await queryRunner.query(
      `INSERT INTO ${quoteIdentifier(table.name)} (${columnSql})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updateSql}`,
      columns.map((column) => row[column]),
    );
  }

  const ids = spec.rows.map((row) => row.id);
  const result: Array<{ total: string | number }> = await queryRunner.query(
    `SELECT COUNT(*) AS total
       FROM ${quoteIdentifier(table.name)}
      WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  if (Number(result[0]?.total ?? 0) < SEED_COUNT) {
    throw new Error(`Bảng ${table.name} chưa có đủ ${SEED_COUNT} seed records`);
  }
  console.log(`Seeded ${table.name}: ${SEED_COUNT} records`);
}

async function buildSeedData(passwordHash: string): Promise<TableSeed[]> {
  const now = new Date('2026-07-24T08:00:00.000Z');
  return [
    {
      names: ['staffs'],
      rows: [
        {
          id: 900011,
          name: 'Nguyễn An',
          personal_email: 'staffs.0101@example.com',
          employee_code: 'STAF-0101',
          facility_id: 900091,
          email: 'staffs.0101@example.com',
          phone: '0900100001',
          password: passwordHash,
          address: 'Hà Nội',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900012,
          name: 'Trần Bình',
          personal_email: 'staffs.0102@example.com',
          employee_code: 'STAF-0102',
          facility_id: 900092,
          email: 'staffs.0102@example.com',
          phone: '0900100002',
          password: passwordHash,
          address: 'Hà Nội',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900013,
          name: 'Lê Chi',
          personal_email: 'staffs.0103@example.com',
          employee_code: 'STAF-0103',
          facility_id: 900093,
          email: 'staffs.0103@example.com',
          phone: '0900100003',
          password: passwordHash,
          address: 'Hà Nội',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900014,
          name: 'Phạm Dũng',
          personal_email: 'staffs.0104@example.com',
          employee_code: 'STAF-0104',
          facility_id: 900094,
          email: 'staffs.0104@example.com',
          phone: '0900100004',
          password: passwordHash,
          address: 'Hà Nội',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900015,
          name: 'Hoàng Giang',
          personal_email: 'staffs.0105@example.com',
          employee_code: 'STAF-0105',
          facility_id: 900095,
          email: 'staffs.0105@example.com',
          phone: '0900100005',
          password: passwordHash,
          address: 'Hà Nội',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['roles'],
      rows: [
        {
          id: 900021,
          name: 'super_admin',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900022,
          name: 'admin',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900023,
          name: 'doctor',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900024,
          name: 'staff',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900025,
          name: 'nurse',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ],
    },
    {
      names: ['permissions'],
      rows: [
        {
          id: 900031,
          name: 'user.view',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900032,
          name: 'facility.view',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900033,
          name: 'appointment.view',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900034,
          name: 'medical_record.view',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          id: 900035,
          name: 'report.view',
          guard_name: 'api',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ],
    },
    {
      names: ['staff_roles'],
      rows: [
        { id: 900041, staff_id: 900011, role_id: 900021, created_at: now, updated_at: now },
        { id: 900042, staff_id: 900012, role_id: 900022, created_at: now, updated_at: now },
        { id: 900043, staff_id: 900013, role_id: 900023, created_at: now, updated_at: now },
        { id: 900044, staff_id: 900014, role_id: 900024, created_at: now, updated_at: now },
        { id: 900045, staff_id: 900015, role_id: 900025, created_at: now, updated_at: now },
      ],
    },
    {
      names: ['password_reset_tokens'],
      rows: [
        {
          id: 900051,
          user_id: 900081,
          token_hash: 'seed-token-hash-password_reset_tokens-1',
          expires_at: '2026-08-11 09:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900052,
          user_id: 900082,
          token_hash: 'seed-token-hash-password_reset_tokens-2',
          expires_at: '2026-08-12 10:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900053,
          user_id: 900083,
          token_hash: 'seed-token-hash-password_reset_tokens-3',
          expires_at: '2026-08-13 11:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900054,
          user_id: 900084,
          token_hash: 'seed-token-hash-password_reset_tokens-4',
          expires_at: '2026-08-14 12:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900055,
          user_id: 900085,
          token_hash: 'seed-token-hash-password_reset_tokens-5',
          expires_at: '2026-08-15 13:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['refresh_tokens'],
      rows: [
        {
          id: 900061,
          user_id: 900081,
          token_hash: 'seed-token-hash-refresh_tokens-1',
          expires_at: '2026-08-11 09:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 1',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900062,
          user_id: 900082,
          token_hash: 'seed-token-hash-refresh_tokens-2',
          expires_at: '2026-08-12 10:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 2',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900063,
          user_id: 900083,
          token_hash: 'seed-token-hash-refresh_tokens-3',
          expires_at: '2026-08-13 11:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 3',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900064,
          user_id: 900084,
          token_hash: 'seed-token-hash-refresh_tokens-4',
          expires_at: '2026-08-14 12:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 4',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900065,
          user_id: 900085,
          token_hash: 'seed-token-hash-refresh_tokens-5',
          expires_at: '2026-08-15 13:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 5',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['role_permissions'],
      rows: [
        { id: 900071, role_id: 900021, permission_id: 900031, created_at: now, updated_at: now },
        { id: 900072, role_id: 900022, permission_id: 900032, created_at: now, updated_at: now },
        { id: 900073, role_id: 900023, permission_id: 900033, created_at: now, updated_at: now },
        { id: 900074, role_id: 900024, permission_id: 900034, created_at: now, updated_at: now },
        { id: 900075, role_id: 900025, permission_id: 900035, created_at: now, updated_at: now },
      ],
    },
    {
      names: ['facilities'],
      rows: [
        {
          id: 900091,
          name: 'Phòng khám Thai sản Mẫu 1',
          code: 'FACI-0901',
          owner_id: 900011,
          phone: '0900900001',
          email: 'facilities.0901@example.com',
          open_time: '08:00:00',
          close_time: '17:00:00',
          working_days: '1,2,3,4,5,6',
          address: 'Số 10, đường Mẫu, Hà Nội',
          province: 'Hà Nội',
          ward: 'Phường mẫu 1',
          latitude: '21.015000',
          longitude: '105.811900',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          delete_reason: null,
        },
        {
          id: 900092,
          name: 'Phòng khám Thai sản Mẫu 2',
          code: 'FACI-0902',
          owner_id: 900012,
          phone: '0900900002',
          email: 'facilities.0902@example.com',
          open_time: '09:00:00',
          close_time: '18:00:00',
          working_days: '1,2,3,4,5,6',
          address: 'Số 20, đường Mẫu, Hà Nội',
          province: 'Hà Nội',
          ward: 'Phường mẫu 2',
          latitude: '21.025000',
          longitude: '105.821900',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          delete_reason: null,
        },
        {
          id: 900093,
          name: 'Phòng khám Thai sản Mẫu 3',
          code: 'FACI-0903',
          owner_id: 900013,
          phone: '0900900003',
          email: 'facilities.0903@example.com',
          open_time: '10:00:00',
          close_time: '19:00:00',
          working_days: '1,2,3,4,5,6',
          address: 'Số 30, đường Mẫu, Hà Nội',
          province: 'Hà Nội',
          ward: 'Phường mẫu 3',
          latitude: '21.035000',
          longitude: '105.831900',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          delete_reason: null,
        },
        {
          id: 900094,
          name: 'Phòng khám Thai sản Mẫu 4',
          code: 'FACI-0904',
          owner_id: 900014,
          phone: '0900900004',
          email: 'facilities.0904@example.com',
          open_time: '11:00:00',
          close_time: '20:00:00',
          working_days: '1,2,3,4,5,6',
          address: 'Số 40, đường Mẫu, Hà Nội',
          province: 'Hà Nội',
          ward: 'Phường mẫu 4',
          latitude: '21.045000',
          longitude: '105.841900',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          delete_reason: null,
        },
        {
          id: 900095,
          name: 'Phòng khám Thai sản Mẫu 5',
          code: 'FACI-0905',
          owner_id: 900015,
          phone: '0900900005',
          email: 'facilities.0905@example.com',
          open_time: '12:00:00',
          close_time: '21:00:00',
          working_days: '1,2,3,4,5,6',
          address: 'Số 50, đường Mẫu, Hà Nội',
          province: 'Hà Nội',
          ward: 'Phường mẫu 5',
          latitude: '21.055000',
          longitude: '105.851900',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          delete_reason: null,
        },
      ],
    },
    {
      names: ['staff_password_reset_tokens'],
      rows: [
        {
          id: 900101,
          staff_id: 900011,
          token_hash: 'seed-token-hash-staff_password_reset_tokens-1',
          expires_at: '2026-08-11 09:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900102,
          staff_id: 900012,
          token_hash: 'seed-token-hash-staff_password_reset_tokens-2',
          expires_at: '2026-08-12 10:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900103,
          staff_id: 900013,
          token_hash: 'seed-token-hash-staff_password_reset_tokens-3',
          expires_at: '2026-08-13 11:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900104,
          staff_id: 900014,
          token_hash: 'seed-token-hash-staff_password_reset_tokens-4',
          expires_at: '2026-08-14 12:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900105,
          staff_id: 900015,
          token_hash: 'seed-token-hash-staff_password_reset_tokens-5',
          expires_at: '2026-08-15 13:00:00',
          used_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['staff_refresh_tokens'],
      rows: [
        {
          id: 900111,
          staff_id: 900011,
          token_hash: 'seed-token-hash-staff_refresh_tokens-1',
          expires_at: '2026-08-11 09:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 1',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900112,
          staff_id: 900012,
          token_hash: 'seed-token-hash-staff_refresh_tokens-2',
          expires_at: '2026-08-12 10:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 2',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900113,
          staff_id: 900013,
          token_hash: 'seed-token-hash-staff_refresh_tokens-3',
          expires_at: '2026-08-13 11:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 3',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900114,
          staff_id: 900014,
          token_hash: 'seed-token-hash-staff_refresh_tokens-4',
          expires_at: '2026-08-14 12:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 4',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900115,
          staff_id: 900015,
          token_hash: 'seed-token-hash-staff_refresh_tokens-5',
          expires_at: '2026-08-15 13:00:00',
          revoked_at: null,
          replaced_by_token_hash: 'replacedByTokenHash mẫu 5',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['facility_services'],
      rows: [
        {
          id: 900121,
          facility_id: 900091,
          service_id: 900491,
          price: '250000.00',
          duration_minutes: 30,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900122,
          facility_id: 900092,
          service_id: 900492,
          price: '500000.00',
          duration_minutes: 30,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900123,
          facility_id: 900093,
          service_id: 900493,
          price: '750000.00',
          duration_minutes: 30,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900124,
          facility_id: 900094,
          service_id: 900494,
          price: '1000000.00',
          duration_minutes: 30,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900125,
          facility_id: 900095,
          service_id: 900495,
          price: '1250000.00',
          duration_minutes: 30,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['doctors'],
      rows: [
        {
          id: 900131,
          staff_id: 900011,
          license_no: 'CCHN-SEED-1301',
          title: 'Nội dung mẫu 1 của doctors',
          specialty: 'Sản phụ khoa',
          years_of_experience: 5,
          bio: 'Thông tin mẫu số 1 cho doctors.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900132,
          staff_id: 900012,
          license_no: 'CCHN-SEED-1302',
          title: 'Nội dung mẫu 2 của doctors',
          specialty: 'Sản phụ khoa',
          years_of_experience: 6,
          bio: 'Thông tin mẫu số 2 cho doctors.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900133,
          staff_id: 900013,
          license_no: 'CCHN-SEED-1303',
          title: 'Nội dung mẫu 3 của doctors',
          specialty: 'Sản phụ khoa',
          years_of_experience: 7,
          bio: 'Thông tin mẫu số 3 cho doctors.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900134,
          staff_id: 900014,
          license_no: 'CCHN-SEED-1304',
          title: 'Nội dung mẫu 4 của doctors',
          specialty: 'Sản phụ khoa',
          years_of_experience: 8,
          bio: 'Thông tin mẫu số 4 cho doctors.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900135,
          staff_id: 900015,
          license_no: 'CCHN-SEED-1305',
          title: 'Nội dung mẫu 5 của doctors',
          specialty: 'Sản phụ khoa',
          years_of_experience: 9,
          bio: 'Thông tin mẫu số 5 cho doctors.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['rooms'],
      rows: [
        {
          id: 900141,
          facility_id: 900091,
          name: 'Nguyễn An',
          room_type_id: 900161,
          floor: '1',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
        },
        {
          id: 900142,
          facility_id: 900092,
          name: 'Trần Bình',
          room_type_id: 900162,
          floor: '2',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
        },
        {
          id: 900143,
          facility_id: 900093,
          name: 'Lê Chi',
          room_type_id: 900163,
          floor: '3',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
        },
        {
          id: 900144,
          facility_id: 900094,
          name: 'Phạm Dũng',
          room_type_id: 900164,
          floor: '4',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
        },
        {
          id: 900145,
          facility_id: 900095,
          name: 'Hoàng Giang',
          room_type_id: 900165,
          floor: '5',
          status: 'active',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
        },
      ],
    },
    {
      names: ['room_types'],
      rows: [
        {
          id: 900161,
          name: 'Phòng khám',
          description: 'Thông tin mẫu số 1 cho room_types.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900162,
          name: 'Phòng siêu âm',
          description: 'Thông tin mẫu số 2 cho room_types.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900163,
          name: 'Phòng xét nghiệm',
          description: 'Thông tin mẫu số 3 cho room_types.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900164,
          name: 'Phòng tư vấn',
          description: 'Thông tin mẫu số 4 cho room_types.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900165,
          name: 'Phòng theo dõi',
          description: 'Thông tin mẫu số 5 cho room_types.',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['maternity_packages'],
      rows: [
        {
          id: 900211,
          code: 'MATE-2101',
          facility_id: 900091,
          name: 'Gói thai sản mẫu 1',
          description: 'Thông tin mẫu số 1 cho maternity_packages.',
          price: '250000.00',
          duration_days: 30,
          priority_level: 1,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900212,
          code: 'MATE-2102',
          facility_id: 900092,
          name: 'Gói thai sản mẫu 2',
          description: 'Thông tin mẫu số 2 cho maternity_packages.',
          price: '500000.00',
          duration_days: 30,
          priority_level: 2,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900213,
          code: 'MATE-2103',
          facility_id: 900093,
          name: 'Gói thai sản mẫu 3',
          description: 'Thông tin mẫu số 3 cho maternity_packages.',
          price: '750000.00',
          duration_days: 30,
          priority_level: 3,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900214,
          code: 'MATE-2104',
          facility_id: 900094,
          name: 'Gói thai sản mẫu 4',
          description: 'Thông tin mẫu số 4 cho maternity_packages.',
          price: '1000000.00',
          duration_days: 30,
          priority_level: 4,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900215,
          code: 'MATE-2105',
          facility_id: 900095,
          name: 'Gói thai sản mẫu 5',
          description: 'Thông tin mẫu số 5 cho maternity_packages.',
          price: '1250000.00',
          duration_days: 30,
          priority_level: 5,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['package_items'],
      rows: [
        {
          id: 900221,
          package_id: 900211,
          facility_service_id: 900121,
          included_quantity: 2,
          is_required: true,
          is_optional: false,
          allowed_facility_scope: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900222,
          package_id: 900212,
          facility_service_id: 900122,
          included_quantity: 2,
          is_required: true,
          is_optional: false,
          allowed_facility_scope: 2,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900223,
          package_id: 900213,
          facility_service_id: 900123,
          included_quantity: 2,
          is_required: true,
          is_optional: false,
          allowed_facility_scope: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900224,
          package_id: 900214,
          facility_service_id: 900124,
          included_quantity: 2,
          is_required: true,
          is_optional: false,
          allowed_facility_scope: 4,
          created_at: now,
          updated_at: now,
        },
        {
          id: 900225,
          package_id: 900215,
          facility_service_id: 900125,
          included_quantity: 2,
          is_required: true,
          is_optional: false,
          allowed_facility_scope: 5,
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['articles'],
      rows: [
        {
          id: 900431,
          author_id: 900011,
          title: 'Nội dung mẫu 1 của articles',
          slug: 'articles-mau-1',
          summary: 'Thông tin mẫu số 1 cho articles.',
          content: 'Nội dung dữ liệu mẫu số 1 cho bảng articles.',
          status: 'published',
          approved_by: 900011,
          approved_at: null,
          published_at: '2026-08-11 09:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900432,
          author_id: 900012,
          title: 'Nội dung mẫu 2 của articles',
          slug: 'articles-mau-2',
          summary: 'Thông tin mẫu số 2 cho articles.',
          content: 'Nội dung dữ liệu mẫu số 2 cho bảng articles.',
          status: 'published',
          approved_by: 900012,
          approved_at: null,
          published_at: '2026-08-12 10:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900433,
          author_id: 900013,
          title: 'Nội dung mẫu 3 của articles',
          slug: 'articles-mau-3',
          summary: 'Thông tin mẫu số 3 cho articles.',
          content: 'Nội dung dữ liệu mẫu số 3 cho bảng articles.',
          status: 'published',
          approved_by: 900013,
          approved_at: null,
          published_at: '2026-08-13 11:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900434,
          author_id: 900014,
          title: 'Nội dung mẫu 4 của articles',
          slug: 'articles-mau-4',
          summary: 'Thông tin mẫu số 4 cho articles.',
          content: 'Nội dung dữ liệu mẫu số 4 cho bảng articles.',
          status: 'published',
          approved_by: 900014,
          approved_at: null,
          published_at: '2026-08-14 12:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900435,
          author_id: 900015,
          title: 'Nội dung mẫu 5 của articles',
          slug: 'articles-mau-5',
          summary: 'Thông tin mẫu số 5 cho articles.',
          content: 'Nội dung dữ liệu mẫu số 5 cho bảng articles.',
          status: 'published',
          approved_by: 900015,
          approved_at: null,
          published_at: '2026-08-15 13:00:00',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['faqs'],
      rows: [
        {
          id: 900441,
          author_id: 900011,
          question: 'Câu hỏi thai sản mẫu số 1?',
          answer: 'Câu trả lời tham khảo cho câu hỏi mẫu số 1.',
          category: 'Chăm sóc thai kỳ',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900442,
          author_id: 900012,
          question: 'Câu hỏi thai sản mẫu số 2?',
          answer: 'Câu trả lời tham khảo cho câu hỏi mẫu số 2.',
          category: 'Chăm sóc thai kỳ',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900443,
          author_id: 900013,
          question: 'Câu hỏi thai sản mẫu số 3?',
          answer: 'Câu trả lời tham khảo cho câu hỏi mẫu số 3.',
          category: 'Chăm sóc thai kỳ',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900444,
          author_id: 900014,
          question: 'Câu hỏi thai sản mẫu số 4?',
          answer: 'Câu trả lời tham khảo cho câu hỏi mẫu số 4.',
          category: 'Chăm sóc thai kỳ',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900445,
          author_id: 900015,
          question: 'Câu hỏi thai sản mẫu số 5?',
          answer: 'Câu trả lời tham khảo cho câu hỏi mẫu số 5.',
          category: 'Chăm sóc thai kỳ',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['services'],
      rows: [
        {
          id: 900491,
          code: 'SERV-4901',
          name: 'Khám thai định kỳ',
          description: 'Thông tin mẫu số 1 cho services.',
          service_type: 'prenatal',
          default_duration_minutes: 30,
          base_price: '250000.00',
          requires_doctor_warning: false,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900492,
          code: 'SERV-4902',
          name: 'Siêu âm thai',
          description: 'Thông tin mẫu số 2 cho services.',
          service_type: 'prenatal',
          default_duration_minutes: 30,
          base_price: '500000.00',
          requires_doctor_warning: false,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900493,
          code: 'SERV-4903',
          name: 'Xét nghiệm máu',
          description: 'Thông tin mẫu số 3 cho services.',
          service_type: 'prenatal',
          default_duration_minutes: 30,
          base_price: '750000.00',
          requires_doctor_warning: false,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900494,
          code: 'SERV-4904',
          name: 'Tư vấn dinh dưỡng',
          description: 'Thông tin mẫu số 4 cho services.',
          service_type: 'prenatal',
          default_duration_minutes: 30,
          base_price: '1000000.00',
          requires_doctor_warning: false,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900495,
          code: 'SERV-4905',
          name: 'Theo dõi tim thai',
          description: 'Thông tin mẫu số 5 cho services.',
          service_type: 'prenatal',
          default_duration_minutes: 30,
          base_price: '1250000.00',
          requires_doctor_warning: false,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['forum_topics'],
      rows: [
        {
          id: 900501,
          author_id: 900011,
          title: 'Nội dung mẫu 1 của forum_topics',
          slug: 'forum-topics-mau-1',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900502,
          author_id: 900012,
          title: 'Nội dung mẫu 2 của forum_topics',
          slug: 'forum-topics-mau-2',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900503,
          author_id: 900013,
          title: 'Nội dung mẫu 3 của forum_topics',
          slug: 'forum-topics-mau-3',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900504,
          author_id: 900014,
          title: 'Nội dung mẫu 4 của forum_topics',
          slug: 'forum-topics-mau-4',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900505,
          author_id: 900015,
          title: 'Nội dung mẫu 5 của forum_topics',
          slug: 'forum-topics-mau-5',
          status: 'active',
          created_at: now,
          updated_at: now,
        },
      ],
    },
    {
      names: ['shift_slots'],
      rows: [
        {
          id: 900511,
          facility_id: 900091,
          name: 'Nguyễn An',
          start_time: '08:00:00',
          end_time: '17:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900512,
          facility_id: 900092,
          name: 'Trần Bình',
          start_time: '09:00:00',
          end_time: '18:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900513,
          facility_id: 900093,
          name: 'Lê Chi',
          start_time: '10:00:00',
          end_time: '19:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900514,
          facility_id: 900094,
          name: 'Phạm Dũng',
          start_time: '11:00:00',
          end_time: '20:00:00',
          created_at: now,
          updated_at: now,
        },
        {
          id: 900515,
          facility_id: 900095,
          name: 'Hoàng Giang',
          start_time: '12:00:00',
          end_time: '21:00:00',
          created_at: now,
          updated_at: now,
        },
      ],
    },
  ];
}

export class DatabaseSeeder {
  constructor(private readonly connection: DataSource) {}

  async run(): Promise<void> {
    const passwordHash = await bcrypt.hash(
      SEED_PASSWORD,
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );
    const seedData = await buildSeedData(passwordHash);
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.startTransaction();
    try {
      for (const spec of seedData) {
        await upsertRows(queryRunner, spec);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      await queryRunner.release();
    }
  }
}

async function seed(): Promise<void> {
  await dataSource.initialize();
  try {
    await new DatabaseSeeder(dataSource).run();
    console.log('DatabaseSeeder completed successfully');
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('DatabaseSeeder failed:', error);
  process.exit(1);
});
