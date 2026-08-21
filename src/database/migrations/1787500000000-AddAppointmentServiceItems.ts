import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentServiceItems1787500000000 implements MigrationInterface {
  name = 'AddAppointmentServiceItems1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`appointment_service_items\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`appointment_id\` bigint NOT NULL,
        \`service_id\` bigint NOT NULL,
        \`facility_service_id\` bigint NULL,
        \`doctor_id\` bigint NULL,
        \`room_id\` bigint NOT NULL,
        \`sequence\` int NOT NULL DEFAULT 1,
        \`status\` varchar(50) NOT NULL DEFAULT 'ordered',
        \`checked_in_at\` timestamp NULL,
        \`called_at\` timestamp NULL,
        \`started_at\` timestamp NULL,
        \`result_expected_at\` timestamp NULL,
        \`result_uploaded_at\` timestamp NULL,
        \`completed_at\` timestamp NULL,
        \`note\` text NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_appointment_service_items_appointment\` (\`appointment_id\`),
        INDEX \`idx_appointment_service_items_queue\` (\`service_id\`, \`room_id\`, \`status\`, \`checked_in_at\`),
        CONSTRAINT \`fk_appointment_service_items_appointment\`
          FOREIGN KEY (\`appointment_id\`) REFERENCES \`appointments\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`fk_appointment_service_items_service\`
          FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT \`fk_appointment_service_items_facility_service\`
          FOREIGN KEY (\`facility_service_id\`) REFERENCES \`facility_services\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT \`fk_appointment_service_items_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`staffs\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT \`fk_appointment_service_items_room\`
          FOREIGN KEY (\`room_id\`) REFERENCES \`rooms\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    const hasColumn = await queryRunner.hasColumn('medical_records', 'appointment_service_item_id');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE \`medical_records\`
        ADD \`appointment_service_item_id\` bigint NULL AFTER \`appointment_id\`
      `);
      await queryRunner.query(`
        ALTER TABLE \`medical_records\`
        ADD INDEX \`idx_medical_records_service_item\` (\`appointment_service_item_id\`)
      `);
      await queryRunner.query(`
        ALTER TABLE \`medical_records\`
        ADD CONSTRAINT \`fk_medical_records_service_item\`
          FOREIGN KEY (\`appointment_service_item_id\`) REFERENCES \`appointment_service_items\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('medical_records', 'appointment_service_item_id');
    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE \`medical_records\`
        DROP FOREIGN KEY \`fk_medical_records_service_item\`
      `);
      await queryRunner.query(
        'ALTER TABLE `medical_records` DROP INDEX `idx_medical_records_service_item`',
      );
      await queryRunner.query(
        'ALTER TABLE `medical_records` DROP COLUMN `appointment_service_item_id`',
      );
    }
    await queryRunner.query('DROP TABLE IF EXISTS `appointment_service_items`');
  }
}
