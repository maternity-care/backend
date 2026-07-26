import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateServicePackageDesign1785120000000 implements MigrationInterface {
  name = 'UpdateServicePackageDesign1785120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('services', 'sale_mode'))) {
      await queryRunner.query(
        "ALTER TABLE `services` ADD `sale_mode` enum ('standalone', 'package_only', 'both') NOT NULL DEFAULT 'both'",
      );
    }

    if (!(await queryRunner.hasColumn('maternity_packages', 'package_type'))) {
      await queryRunner.query(
        "ALTER TABLE `maternity_packages` ADD `package_type` enum ('quantity', 'schedule') NOT NULL DEFAULT 'quantity' AFTER `description`",
      );
    }

    if (await queryRunner.hasColumn('package_items', 'allowed_facility_scope')) {
      await queryRunner.query(
        "ALTER TABLE `package_items` MODIFY `allowed_facility_scope` varchar(20) NOT NULL DEFAULT 'all'",
      );
      await queryRunner.query(
        "UPDATE `package_items` SET `allowed_facility_scope` = 'all' WHERE `allowed_facility_scope` IN ('0', '', 'all')",
      );
      await queryRunner.query(
        "UPDATE `package_items` SET `allowed_facility_scope` = 'selected' WHERE `allowed_facility_scope` IN ('1', 'selected')",
      );
    }

    if (!(await queryRunner.hasColumn('package_items', 'sort_order'))) {
      await queryRunner.query(
        'ALTER TABLE `package_items` ADD `sort_order` int NOT NULL DEFAULT 0 AFTER `allowed_facility_scope`',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('package_items', 'sort_order')) {
      await queryRunner.query('ALTER TABLE `package_items` DROP COLUMN `sort_order`');
    }

    if (await queryRunner.hasColumn('package_items', 'allowed_facility_scope')) {
      await queryRunner.query(
        'ALTER TABLE `package_items` MODIFY `allowed_facility_scope` int NOT NULL',
      );
      await queryRunner.query(
        "UPDATE `package_items` SET `allowed_facility_scope` = 1 WHERE `allowed_facility_scope` = 'selected'",
      );
      await queryRunner.query(
        "UPDATE `package_items` SET `allowed_facility_scope` = 0 WHERE `allowed_facility_scope` <> '1'",
      );
    }

    if (await queryRunner.hasColumn('services', 'sale_mode')) {
      await queryRunner.query('ALTER TABLE `services` DROP COLUMN `sale_mode`');
    }

    if (await queryRunner.hasColumn('maternity_packages', 'package_type')) {
      await queryRunner.query('ALTER TABLE `maternity_packages` DROP COLUMN `package_type`');
    }
  }
}
