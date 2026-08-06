import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentDisruptionWorkflow1786500000000 implements MigrationInterface {
  name = 'AddAppointmentDisruptionWorkflow1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `notifications` DROP FOREIGN KEY `FK_9a8a82462cab47c73d25f49261f`');
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        MODIFY \`user_id\` bigint NULL,
        ADD COLUMN \`staff_id\` bigint NULL AFTER \`user_id\`,
        MODIFY \`type\` enum ('appointment','reminder','exam_result','pregnancy_profile','payment','package','system','appointment_disruption') NOT NULL,
        MODIFY \`reference_type\` enum ('appointment','exam','pregnancy_profile','payment','package','shift_disruption') NOT NULL
    `);
    await queryRunner.query('CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`, `created_at`)');
    await queryRunner.query('CREATE INDEX `idx_notifications_staff_created` ON `notifications` (`staff_id`, `created_at`)');
    await queryRunner.query('ALTER TABLE `notifications` ADD CONSTRAINT `FK_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE `notifications` ADD CONSTRAINT `FK_notifications_staff` FOREIGN KEY (`staff_id`) REFERENCES `staffs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');

    await queryRunner.query('ALTER TABLE `appointments` ADD COLUMN `shift_id` bigint NULL AFTER `id`');
    await queryRunner.query('CREATE INDEX `idx_appointments_shift_id` ON `appointments` (`shift_id`)');
    await queryRunner.query('ALTER TABLE `appointments` ADD CONSTRAINT `FK_appointments_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
    await queryRunner.query(`
      UPDATE appointments appointment
      INNER JOIN shifts shift
        ON shift.facility_id = appointment.facility_id
        AND shift.staff_id = appointment.doctor_id
        AND shift.room_id = appointment.room_id
        AND shift.shift_date = DATE(appointment.scheduled_start)
        AND shift.start_time <= TIME(appointment.scheduled_start)
        AND shift.end_time >= TIME(appointment.scheduled_end)
      SET appointment.shift_id = shift.id
      WHERE appointment.shift_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`appointment_disruption_items\`
        ADD COLUMN \`new_shift_id\` bigint NULL AFTER \`selected_option\`,
        ADD COLUMN \`new_staff_id\` bigint NULL AFTER \`new_shift_id\`,
        ADD COLUMN \`new_room_id\` bigint NULL AFTER \`new_staff_id\`,
        ADD COLUMN \`new_scheduled_start\` timestamp NULL AFTER \`new_room_id\`,
        ADD COLUMN \`new_scheduled_end\` timestamp NULL AFTER \`new_scheduled_start\`,
        ADD COLUMN \`resolution_note\` text NULL AFTER \`new_scheduled_end\`,
        ADD COLUMN \`notified_at\` timestamp NULL AFTER \`resolved_at\`,
        ADD COLUMN \`email_sent_at\` timestamp NULL AFTER \`notified_at\`
    `);
    await queryRunner.query('CREATE INDEX `idx_disruption_items_appointment` ON `appointment_disruption_items` (`appointment_id`)');
    await queryRunner.query('ALTER TABLE `appointment_disruption_items` ADD CONSTRAINT `FK_disruption_item_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `appointment_disruption_items` DROP FOREIGN KEY `FK_disruption_item_appointment`');
    await queryRunner.query('DROP INDEX `idx_disruption_items_appointment` ON `appointment_disruption_items`');
    await queryRunner.query(`
      ALTER TABLE \`appointment_disruption_items\`
        DROP COLUMN \`email_sent_at\`,
        DROP COLUMN \`notified_at\`,
        DROP COLUMN \`resolution_note\`,
        DROP COLUMN \`new_scheduled_end\`,
        DROP COLUMN \`new_scheduled_start\`,
        DROP COLUMN \`new_room_id\`,
        DROP COLUMN \`new_staff_id\`,
        DROP COLUMN \`new_shift_id\`
    `);

    await queryRunner.query('ALTER TABLE `appointments` DROP FOREIGN KEY `FK_appointments_shift`');
    await queryRunner.query('DROP INDEX `idx_appointments_shift_id` ON `appointments`');
    await queryRunner.query('ALTER TABLE `appointments` DROP COLUMN `shift_id`');

    await queryRunner.query('ALTER TABLE `notifications` DROP FOREIGN KEY `FK_notifications_staff`');
    await queryRunner.query('ALTER TABLE `notifications` DROP FOREIGN KEY `FK_notifications_user`');
    await queryRunner.query('DROP INDEX `idx_notifications_staff_created` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_user_created` ON `notifications`');
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        DROP COLUMN \`staff_id\`,
        MODIFY \`user_id\` bigint NOT NULL,
        MODIFY \`type\` enum ('appointment','reminder','exam_result','pregnancy_profile','payment','package','system') NOT NULL,
        MODIFY \`reference_type\` enum ('appointment','exam','pregnancy_profile','payment','package') NOT NULL
    `);
    await queryRunner.query('ALTER TABLE `notifications` ADD CONSTRAINT `FK_9a8a82462cab47c73d25f49261f` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
  }
}
