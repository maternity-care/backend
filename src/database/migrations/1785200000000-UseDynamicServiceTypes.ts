import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseDynamicServiceTypes1785200000000 implements MigrationInterface {
  name = 'UseDynamicServiceTypes1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`service_types\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`code\` varchar(50) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` timestamp(6) NULL,
        \`deleted_by\` bigint NULL,
        \`delete_reason\` text NULL,
        UNIQUE INDEX \`uq_service_types_code\` (\`code\`),
        UNIQUE INDEX \`uq_service_types_name\` (\`name\`),
        INDEX \`idx_service_types_status\` (\`status\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO \`service_types\` (\`code\`, \`name\`, \`description\`, \`status\`)
      SELECT DISTINCT
        UPPER(REPLACE(REPLACE(TRIM(\`service_type\`), ' ', '_'), '-', '_')) AS \`code\`,
        TRIM(\`service_type\`) AS \`name\`,
        CONCAT('Loại dịch vụ được migrate từ services.service_type: ', TRIM(\`service_type\`)) AS \`description\`,
        'active' AS \`status\`
      FROM \`services\`
      WHERE \`service_type\` IS NOT NULL AND TRIM(\`service_type\`) <> ''
      ON DUPLICATE KEY UPDATE \`updated_at\` = CURRENT_TIMESTAMP(6)
    `);

    await queryRunner.query(`
      INSERT INTO \`service_types\` (\`code\`, \`name\`, \`description\`, \`status\`)
      SELECT 'OTHER', 'Khác', 'Loại dịch vụ mặc định khi dữ liệu cũ thiếu service_type', 'active'
      WHERE NOT EXISTS (SELECT 1 FROM \`service_types\` WHERE \`code\` = 'OTHER')
    `);

    if (!(await queryRunner.hasColumn('services', 'service_type_id'))) {
      await queryRunner.query(
        'ALTER TABLE `services` ADD `service_type_id` bigint NULL AFTER `description`',
      );
    }

    if (await queryRunner.hasColumn('services', 'service_type')) {
      await queryRunner.query(`
        UPDATE \`services\` s
        LEFT JOIN \`service_types\` st
          ON st.\`code\` = UPPER(REPLACE(REPLACE(TRIM(s.\`service_type\`), ' ', '_'), '-', '_'))
        SET s.\`service_type_id\` = COALESCE(
          st.\`id\`,
          (SELECT fallback.\`id\` FROM \`service_types\` fallback WHERE fallback.\`code\` = 'OTHER' LIMIT 1)
        )
      `);
    } else {
      await queryRunner.query(`
        UPDATE \`services\` s
        SET s.\`service_type_id\` = (
          SELECT fallback.\`id\` FROM \`service_types\` fallback WHERE fallback.\`code\` = 'OTHER' LIMIT 1
        )
        WHERE s.\`service_type_id\` IS NULL
      `);
    }

    await queryRunner.query(
      'ALTER TABLE `services` MODIFY `service_type_id` bigint NOT NULL',
    );

    await this.createIndexIfMissing(
      queryRunner,
      'services',
      'idx_services_service_type_id',
      'CREATE INDEX `idx_services_service_type_id` ON `services` (`service_type_id`)',
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'services',
      'fk_services_service_type',
      'ALTER TABLE `services` ADD CONSTRAINT `fk_services_service_type` FOREIGN KEY (`service_type_id`) REFERENCES `service_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    );

    if (await queryRunner.hasColumn('services', 'service_type')) {
      await queryRunner.query('ALTER TABLE `services` DROP COLUMN `service_type`');
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`package_service_facilities\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`package_item_id\` bigint NOT NULL,
        \`facility_id\` bigint NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_package_service_facility\` (\`package_item_id\`, \`facility_id\`),
        INDEX \`idx_package_service_facilities_facility_id\` (\`facility_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await this.createForeignKeyIfMissing(
      queryRunner,
      'package_service_facilities',
      'fk_package_service_facilities_package_item',
      'ALTER TABLE `package_service_facilities` ADD CONSTRAINT `fk_package_service_facilities_package_item` FOREIGN KEY (`package_item_id`) REFERENCES `package_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'package_service_facilities',
      'fk_package_service_facilities_facility',
      'ALTER TABLE `package_service_facilities` ADD CONSTRAINT `fk_package_service_facilities_facility` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropForeignKeyIfExists(
      queryRunner,
      'package_service_facilities',
      'fk_package_service_facilities_facility',
    );
    await this.dropForeignKeyIfExists(
      queryRunner,
      'package_service_facilities',
      'fk_package_service_facilities_package_item',
    );
    await queryRunner.query('DROP TABLE IF EXISTS `package_service_facilities`');

    if (!(await queryRunner.hasColumn('services', 'service_type'))) {
      await queryRunner.query(
        'ALTER TABLE `services` ADD `service_type` varchar(255) NULL AFTER `description`',
      );
      await queryRunner.query(`
        UPDATE \`services\` s
        LEFT JOIN \`service_types\` st ON st.\`id\` = s.\`service_type_id\`
        SET s.\`service_type\` = COALESCE(st.\`code\`, 'OTHER')
      `);
      await queryRunner.query(
        "ALTER TABLE `services` MODIFY `service_type` varchar(255) NOT NULL DEFAULT 'OTHER'",
      );
    }

    await this.dropForeignKeyIfExists(queryRunner, 'services', 'fk_services_service_type');

    await this.dropIndexIfExists(queryRunner, 'services', 'idx_services_service_type_id');

    if (await queryRunner.hasColumn('services', 'service_type_id')) {
      await queryRunner.query('ALTER TABLE `services` DROP COLUMN `service_type_id`');
    }

    await queryRunner.query('DROP TABLE IF EXISTS `service_types`');
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
