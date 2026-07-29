import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPackageStages1785400000000 implements MigrationInterface {
  name = 'AddPackageStages1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`package_stages\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`package_id\` bigint NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`stage_type\` enum ('pregnancy_week', 'postpartum', 'custom') NOT NULL DEFAULT 'pregnancy_week',
        \`week_from\` int NULL,
        \`week_to\` int NULL,
        \`goal\` text NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`idx_package_stages_package_id\` (\`package_id\`),
        INDEX \`idx_package_stages_order\` (\`package_id\`, \`sort_order\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await this.createForeignKeyIfMissing(
      queryRunner,
      'package_stages',
      'fk_package_stages_package',
      'ALTER TABLE `package_stages` ADD CONSTRAINT `fk_package_stages_package` FOREIGN KEY (`package_id`) REFERENCES `maternity_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );

    if (!(await queryRunner.hasColumn('package_items', 'package_stage_id'))) {
      await queryRunner.query(
        'ALTER TABLE `package_items` ADD `package_stage_id` bigint NULL AFTER `package_id`',
      );
    }

    await this.createIndexIfMissing(
      queryRunner,
      'package_items',
      'idx_package_items_stage_id',
      'CREATE INDEX `idx_package_items_stage_id` ON `package_items` (`package_stage_id`)',
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'package_items',
      'fk_package_items_stage',
      'ALTER TABLE `package_items` ADD CONSTRAINT `fk_package_items_stage` FOREIGN KEY (`package_stage_id`) REFERENCES `package_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropForeignKeyIfExists(queryRunner, 'package_items', 'fk_package_items_stage');
    await this.dropIndexIfExists(queryRunner, 'package_items', 'idx_package_items_stage_id');

    if (await queryRunner.hasColumn('package_items', 'package_stage_id')) {
      await queryRunner.query('ALTER TABLE `package_items` DROP COLUMN `package_stage_id`');
    }

    await this.dropForeignKeyIfExists(queryRunner, 'package_stages', 'fk_package_stages_package');
    await queryRunner.query('DROP TABLE IF EXISTS `package_stages`');
  }

  private async createIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
    sql: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      'SHOW INDEX FROM `' + tableName + '` WHERE Key_name = ?',
      [indexName],
    );
    if (!rows || rows.length === 0) {
      await queryRunner.query(sql);
    }
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      'SHOW INDEX FROM `' + tableName + '` WHERE Key_name = ?',
      [indexName],
    );
    if (rows?.length > 0) {
      await queryRunner.query('DROP INDEX `' + indexName + '` ON `' + tableName + '`');
    }
  }

  private async createForeignKeyIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
    sql: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `,
      [tableName, constraintName],
    );
    if (!rows || rows.length === 0) {
      await queryRunner.query(sql);
    }
  }

  private async dropForeignKeyIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    constraintName: string,
  ): Promise<void> {
    const rows = await queryRunner.query(
      `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `,
      [tableName, constraintName],
    );
    if (rows?.length > 0) {
      await queryRunner.query('ALTER TABLE `' + tableName + '` DROP FOREIGN KEY `' + constraintName + '`');
    }
  }
}
