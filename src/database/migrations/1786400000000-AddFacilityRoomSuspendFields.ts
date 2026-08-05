import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacilityRoomSuspendFields1786400000000 implements MigrationInterface {
  name = 'AddFacilityRoomSuspendFields1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`facilities\`
        ADD COLUMN \`inactive_from\` timestamp NULL,
        ADD COLUMN \`inactive_until\` timestamp NULL,
        ADD COLUMN \`inactive_reason\` text NULL,
        ADD COLUMN \`inactive_by\` bigint NULL,
        ADD COLUMN \`reactivated_at\` timestamp NULL,
        ADD COLUMN \`reactivated_by\` bigint NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`rooms\`
        ADD COLUMN \`inactive_from\` timestamp NULL,
        ADD COLUMN \`inactive_until\` timestamp NULL,
        ADD COLUMN \`inactive_reason\` text NULL,
        ADD COLUMN \`inactive_by\` varchar(255) NULL,
        ADD COLUMN \`reactivated_at\` timestamp NULL,
        ADD COLUMN \`reactivated_by\` varchar(255) NULL
    `);

    await queryRunner.query('CREATE INDEX `idx_facilities_inactive_until` ON `facilities` (`inactive_until`)');
    await queryRunner.query('CREATE INDEX `idx_rooms_inactive_until` ON `rooms` (`inactive_until`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_rooms_inactive_until` ON `rooms`');
    await queryRunner.query('DROP INDEX `idx_facilities_inactive_until` ON `facilities`');

    await queryRunner.query(`
      ALTER TABLE \`rooms\`
        DROP COLUMN \`reactivated_by\`,
        DROP COLUMN \`reactivated_at\`,
        DROP COLUMN \`inactive_by\`,
        DROP COLUMN \`inactive_reason\`,
        DROP COLUMN \`inactive_until\`,
        DROP COLUMN \`inactive_from\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`facilities\`
        DROP COLUMN \`reactivated_by\`,
        DROP COLUMN \`reactivated_at\`,
        DROP COLUMN \`inactive_by\`,
        DROP COLUMN \`inactive_reason\`,
        DROP COLUMN \`inactive_until\`,
        DROP COLUMN \`inactive_from\`
    `);
  }
}
