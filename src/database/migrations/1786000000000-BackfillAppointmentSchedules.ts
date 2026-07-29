import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillAppointmentSchedules1786000000000 implements MigrationInterface {
  name = 'BackfillAppointmentSchedules1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`user_schedules\` (
        \`user_id\`,
        \`title\`,
        \`schedule_type\`,
        \`schedule_date\`,
        \`schedule_time\`,
        \`status\`,
        \`location\`,
        \`doctor\`,
        \`note\`,
        \`source\`,
        \`appointment_id\`,
        \`created_at\`,
        \`updated_at\`
      )
      SELECT
        appointment.patient_id,
        CONCAT('Khám: ', COALESCE(service.name, 'Lịch khám')),
        'checkup',
        DATE(appointment.scheduled_start),
        TIME(appointment.scheduled_start),
        CASE
          WHEN appointment.status IN ('completed') THEN 'done'
          WHEN appointment.status IN ('cancelled', 'no_show') THEN 'missed'
          ELSE 'upcoming'
        END,
        COALESCE(facility.name, facility.address),
        NULLIF(CONCAT_WS(' ', doctor.title, staff.name), ''),
        'Lịch được tạo tự động từ lịch khám đã đặt.',
        'appointment',
        appointment.id,
        appointment.created_at,
        appointment.updated_at
      FROM \`appointments\` appointment
      LEFT JOIN \`services\` service ON service.id = appointment.service_id
      LEFT JOIN \`facilities\` facility ON facility.id = appointment.facility_id
      LEFT JOIN \`staffs\` staff ON staff.id = appointment.doctor_id
      LEFT JOIN \`doctors\` doctor ON doctor.staff_id = staff.id
      LEFT JOIN \`user_schedules\` existing
        ON existing.appointment_id = appointment.id
        AND existing.source = 'appointment'
      WHERE existing.id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`user_schedules\`
      WHERE \`source\` = 'appointment'
    `);
  }
}
