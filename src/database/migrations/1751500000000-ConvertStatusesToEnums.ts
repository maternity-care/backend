import { MigrationInterface, QueryRunner } from 'typeorm';

type EnumColumn = {
  table: string;
  column?: string;
  values: string[];
  nullable?: boolean;
};

const ACTIVE_INACTIVE = ['active', 'inactive'];
const APPOINTMENT = [
  'pending_payment',
  'booked',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'rescheduled',
  'cancelled',
  'no_show',
];

const ENUM_COLUMNS: EnumColumn[] = [
  { table: 'users', values: ['active', 'inactive', 'locked'] },
  { table: 'staffs', values: ['active', 'inactive', 'locked'] },
  { table: 'doctors', values: ACTIVE_INACTIVE },
  { table: 'facilities', values: ['active', 'inactive', 'deleted'] },
  { table: 'rooms', values: ACTIVE_INACTIVE },
  { table: 'facility_staff', values: ACTIVE_INACTIVE },
  { table: 'doctor_shifts', values: ['available', 'full', 'cancelled', 'off'] },
  { table: 'services', values: ACTIVE_INACTIVE },
  { table: 'facility_services', values: ['available', 'unavailable'] },
  { table: 'maternity_packages', values: ['draft', 'active', 'inactive'] },
  {
    table: 'patient_packages',
    values: ['pending_payment', 'active', 'expired', 'cancelled', 'upgraded'],
  },
  {
    table: 'patient_extra_services',
    values: ['pending_payment', 'paid', 'used', 'cancelled'],
  },
  { table: 'pregnancy_profiles', values: ['active', 'completed', 'archived'] },
  { table: 'appointments', values: APPOINTMENT },
  {
    table: 'appointment_status_logs',
    column: 'old_status',
    values: APPOINTMENT,
    nullable: true,
  },
  {
    table: 'appointment_status_logs',
    column: 'new_status',
    values: APPOINTMENT,
  },
  {
    table: 'appointment_reminders',
    values: ['pending', 'sent', 'failed', 'cancelled'],
  },
  {
    table: 'orders',
    values: [
      'draft',
      'pending_payment',
      'paid',
      'cancelled',
      'refunded',
      'partially_refunded',
    ],
  },
  { table: 'payments', values: ['pending', 'success', 'failed', 'cancelled'] },
  { table: 'invoices', values: ['issued', 'cancelled'] },
  {
    table: 'refunds',
    values: ['requested', 'approved', 'rejected', 'processed', 'failed'],
  },
  { table: 'product_categories', values: ACTIVE_INACTIVE },
  { table: 'products', values: ['active', 'inactive', 'out_of_stock'] },
  {
    table: 'product_orders',
    column: 'shipping_status',
    values: ['pending', 'packing', 'shipping', 'delivered', 'cancelled'],
  },
  {
    table: 'prescriptions',
    values: ['draft', 'active', 'cancelled', 'completed'],
  },
  { table: 'chat_conversations', values: ['open', 'pending', 'closed'] },
  {
    table: 'articles',
    values: ['draft', 'pending_review', 'published', 'rejected', 'archived'],
  },
  { table: 'faqs', values: ACTIVE_INACTIVE },
  { table: 'forum_posts', values: ['published', 'hidden', 'deleted'] },
  { table: 'forum_comments', values: ['published', 'hidden', 'deleted'] },
  { table: 'content_reports', values: ['pending', 'resolved', 'rejected'] },
];

export class ConvertStatusesToEnums1751500000000
  implements MigrationInterface
{
  name = 'ConvertStatusesToEnums1751500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE users MODIFY status VARCHAR(30) NOT NULL',
    );
    await queryRunner.query(
      "UPDATE users SET status = CASE status WHEN '1' THEN 'active' WHEN '2' THEN 'locked' ELSE 'inactive' END",
    );
    await queryRunner.query(
      "UPDATE staffs SET status = CASE status WHEN '1' THEN 'active' WHEN '2' THEN 'locked' WHEN '0' THEN 'inactive' ELSE LOWER(status) END",
    );
    await queryRunner.query(
      "UPDATE facilities SET status = CASE status WHEN 'Hoạt động' THEN 'active' WHEN 'Tạm ngưng' THEN 'inactive' ELSE LOWER(status) END",
    );
    await queryRunner.query(
      "UPDATE rooms SET status = CASE status WHEN 'Hoạt động' THEN 'active' WHEN 'Tạm ngưng' THEN 'inactive' ELSE LOWER(status) END",
    );

    for (const definition of ENUM_COLUMNS) {
      const column = definition.column ?? 'status';
      const enumValues = definition.values
        .map((value) => `'${value}'`)
        .join(', ');
      const nullable = definition.nullable ? 'NULL' : 'NOT NULL';
      await queryRunner.query(
        `ALTER TABLE \`${definition.table}\` MODIFY \`${column}\` ENUM(${enumValues}) ${nullable}`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const definition of [...ENUM_COLUMNS].reverse()) {
      const column = definition.column ?? 'status';
      const nullable = definition.nullable ? 'NULL' : 'NOT NULL';
      await queryRunner.query(
        `ALTER TABLE \`${definition.table}\` MODIFY \`${column}\` VARCHAR(30) ${nullable}`,
      );
    }
    await queryRunner.query(
      "UPDATE users SET status = CASE status WHEN 'active' THEN '1' WHEN 'locked' THEN '2' ELSE '0' END",
    );
    await queryRunner.query(
      'ALTER TABLE users MODIFY status TINYINT NOT NULL DEFAULT 1',
    );
  }
}
