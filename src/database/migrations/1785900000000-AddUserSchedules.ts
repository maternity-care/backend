import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSchedules1785900000000 implements MigrationInterface {
  name = 'AddUserSchedules1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_schedules\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`schedule_type\` varchar(50) NOT NULL,
        \`schedule_date\` date NOT NULL,
        \`schedule_time\` time NOT NULL,
        \`status\` varchar(50) NOT NULL DEFAULT 'upcoming',
        \`location\` varchar(255) NULL,
        \`doctor\` varchar(255) NULL,
        \`note\` text NULL,
        \`source\` varchar(50) NOT NULL DEFAULT 'manual',
        \`appointment_id\` bigint NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE INDEX \`idx_user_schedules_user_date_time\`
      ON \`user_schedules\` (\`user_id\`, \`schedule_date\`, \`schedule_time\`)
    `);
    await queryRunner.query(`
      CREATE INDEX \`idx_user_schedules_appointment\`
      ON \`user_schedules\` (\`appointment_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_user_schedules_appointment` ON `user_schedules`');
    await queryRunner.query('DROP INDEX `idx_user_schedules_user_date_time` ON `user_schedules`');
    await queryRunner.query('DROP TABLE `user_schedules`');
  }
}
