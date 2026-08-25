import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMedicalRecordPublication1788300000000 implements MigrationInterface {
  name = 'AddMedicalRecordPublication1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('medical_records', 'is_public'))) {
      await queryRunner.query(
        'ALTER TABLE `medical_records` ADD `is_public` tinyint NOT NULL DEFAULT 0',
      );
    }

    if (!(await queryRunner.hasColumn('medical_records', 'published_at'))) {
      await queryRunner.query(
        'ALTER TABLE `medical_records` ADD `published_at` timestamp NULL',
      );
    }

    if (!(await queryRunner.hasColumn('medical_records', 'published_by'))) {
      await queryRunner.query(
        'ALTER TABLE `medical_records` ADD `published_by` bigint NULL',
      );
    }

    const table = await queryRunner.getTable('medical_records');
    const hasIndex = table?.indices.some((index) => index.name === 'idx_medical_records_public');
    if (!hasIndex) {
      await queryRunner.query(
        'CREATE INDEX `idx_medical_records_public` ON `medical_records` (`is_public`, `published_at`)',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('medical_records');
    const hasIndex = table?.indices.some((index) => index.name === 'idx_medical_records_public');
    if (hasIndex) {
      await queryRunner.query('DROP INDEX `idx_medical_records_public` ON `medical_records`');
    }

    if (await queryRunner.hasColumn('medical_records', 'published_by')) {
      await queryRunner.query('ALTER TABLE `medical_records` DROP COLUMN `published_by`');
    }

    if (await queryRunner.hasColumn('medical_records', 'published_at')) {
      await queryRunner.query('ALTER TABLE `medical_records` DROP COLUMN `published_at`');
    }

    if (await queryRunner.hasColumn('medical_records', 'is_public')) {
      await queryRunner.query('ALTER TABLE `medical_records` DROP COLUMN `is_public`');
    }
  }
}
