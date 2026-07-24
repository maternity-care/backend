import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImproveFacilityRoomsSchema1785000000000 implements MigrationInterface {
  name = 'ImproveFacilityRoomsSchema1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`facilities\`
      MODIFY \`latitude\` decimal(10,7) NOT NULL,
      MODIFY \`longitude\` decimal(10,7) NOT NULL
    `);
    await this.createIndexIfNotExists(queryRunner, 'facilities', 'uq_facilities_code', '`code`', true);
    await this.createIndexIfNotExists(queryRunner, 'facilities', 'uq_facilities_email', '`email`', true);
    await this.createIndexIfNotExists(queryRunner, 'facilities', 'uq_facilities_phone', '`phone`', true);
    await this.createIndexIfNotExists(queryRunner, 'facilities', 'idx_facilities_status', '`status`');
    await this.createIndexIfNotExists(queryRunner, 'facilities', 'idx_facilities_owner_id', '`owner_id`');
    await this.createIndexIfNotExists(queryRunner, 'facilities', 'idx_facilities_location', '`province`, `ward`');

    if (!await queryRunner.hasTable('facility_operating_hours')) {
      await queryRunner.query(`
        CREATE TABLE \`facility_operating_hours\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`facility_id\` bigint NOT NULL,
          \`day_of_week\` enum ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN') NOT NULL,
          \`open_time\` time NULL,
          \`close_time\` time NULL,
          \`is_closed\` tinyint NOT NULL DEFAULT 0,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`uq_facility_operating_hours_day\` (\`facility_id\`, \`day_of_week\`),
          INDEX \`idx_facility_operating_hours_facility_id\` (\`facility_id\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        ALTER TABLE \`facility_operating_hours\`
        ADD CONSTRAINT \`fk_facility_operating_hours_facility_id\`
        FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
      await queryRunner.query(`
        INSERT INTO \`facility_operating_hours\` (\`facility_id\`, \`day_of_week\`, \`open_time\`, \`close_time\`, \`is_closed\`)
        SELECT \`id\`, 'MON', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('MON', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
        UNION ALL SELECT \`id\`, 'TUE', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('TUE', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
        UNION ALL SELECT \`id\`, 'WED', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('WED', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
        UNION ALL SELECT \`id\`, 'THU', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('THU', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
        UNION ALL SELECT \`id\`, 'FRI', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('FRI', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
        UNION ALL SELECT \`id\`, 'SAT', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('SAT', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
        UNION ALL SELECT \`id\`, 'SUN', \`open_time\`, \`close_time\`, IF(FIND_IN_SET('SUN', \`working_days\`) > 0, 0, 1) FROM \`facilities\`
      `);
    }

    if (!await queryRunner.hasTable('facility_closure_days')) {
      await queryRunner.query(`
        CREATE TABLE \`facility_closure_days\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`facility_id\` bigint NOT NULL,
          \`closure_date\` date NOT NULL,
          \`reason\` varchar(500) NULL,
          \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active',
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`uq_facility_closure_days_date\` (\`facility_id\`, \`closure_date\`),
          INDEX \`idx_facility_closure_days_facility_id\` (\`facility_id\`),
          INDEX \`idx_facility_closure_days_status\` (\`status\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        ALTER TABLE \`facility_closure_days\`
        ADD CONSTRAINT \`fk_facility_closure_days_facility_id\`
        FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    if (!await queryRunner.hasColumn('room_types', 'code')) {
      await queryRunner.query(`ALTER TABLE \`room_types\` ADD \`code\` varchar(50) NULL`);
    }
    await queryRunner.query(`UPDATE \`room_types\` SET \`code\` = CONCAT('RT-', LPAD(\`id\`, 3, '0')) WHERE \`code\` IS NULL OR TRIM(\`code\`) = ''`);
    await this.dedupeSingleColumn(queryRunner, 'room_types', 'code');
    await queryRunner.query(`ALTER TABLE \`room_types\` MODIFY \`code\` varchar(50) NOT NULL`);
    await this.addColumnIfNotExists(queryRunner, 'room_types', 'deleted_at', '`deleted_at` timestamp(6) NULL');
    await this.addColumnIfNotExists(queryRunner, 'room_types', 'deleted_by', '`deleted_by` bigint NULL');
    await this.addColumnIfNotExists(queryRunner, 'room_types', 'delete_reason', '`delete_reason` text NULL');
    await this.dedupeSingleColumn(queryRunner, 'room_types', 'name');
    await this.createIndexIfNotExists(queryRunner, 'room_types', 'uq_room_types_code', '`code`', true);
    await this.createIndexIfNotExists(queryRunner, 'room_types', 'uq_room_types_name', '`name`', true);
    await this.createIndexIfNotExists(queryRunner, 'room_types', 'idx_room_types_status', '`status`');

    if (!await queryRunner.hasColumn('rooms', 'code')) {
      await queryRunner.query(`ALTER TABLE \`rooms\` ADD \`code\` varchar(50) NULL`);
    }
    await queryRunner.query(`UPDATE \`rooms\` SET \`code\` = CONCAT('R-', \`facility_id\`, '-', LPAD(\`id\`, 3, '0')) WHERE \`code\` IS NULL OR TRIM(\`code\`) = ''`);
    await this.dedupeByFacility(queryRunner, 'rooms', 'code');
    await queryRunner.query(`ALTER TABLE \`rooms\` MODIFY \`code\` varchar(50) NOT NULL`);
    await this.dedupeByFacility(queryRunner, 'rooms', 'name');
    await this.createIndexIfNotExists(queryRunner, 'rooms', 'uq_rooms_facility_code', '`facility_id`, `code`', true);
    await this.createIndexIfNotExists(queryRunner, 'rooms', 'uq_rooms_facility_name', '`facility_id`, `name`', true);
    await this.createIndexIfNotExists(queryRunner, 'rooms', 'idx_rooms_facility_id', '`facility_id`');
    await this.createIndexIfNotExists(queryRunner, 'rooms', 'idx_rooms_room_type_id', '`room_type_id`');
    await this.createIndexIfNotExists(queryRunner, 'rooms', 'idx_rooms_status', '`status`');
  }

  private async createIndexIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
    columnsSql: string,
    unique = false,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table?.indices.some(index => index.name === indexName)) return;

    await queryRunner.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX \`${indexName}\` ON \`${tableName}\` (${columnsSql})`);
  }

  private async addColumnIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    columnSql: string,
  ): Promise<void> {
    if (await queryRunner.hasColumn(tableName, columnName)) return;
    await queryRunner.query(`ALTER TABLE \`${tableName}\` ADD ${columnSql}`);
  }

  private async dedupeSingleColumn(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
    await queryRunner.query(`
      UPDATE \`${tableName}\` target
      JOIN (
        SELECT current_row.\`id\`, current_row.\`${columnName}\`
        FROM \`${tableName}\` current_row
        JOIN (
          SELECT \`${columnName}\`, MIN(\`id\`) AS keep_id, COUNT(*) AS duplicate_count
          FROM \`${tableName}\`
          GROUP BY \`${columnName}\`
          HAVING duplicate_count > 1
        ) duplicated ON duplicated.\`${columnName}\` = current_row.\`${columnName}\`
        WHERE current_row.\`id\` <> duplicated.keep_id
      ) source ON source.\`id\` = target.\`id\`
      SET target.\`${columnName}\` = CONCAT(LEFT(source.\`${columnName}\`, 29), '_', target.\`id\`)
    `);
  }

  private async dedupeByFacility(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<void> {
    await queryRunner.query(`
      UPDATE \`${tableName}\` target
      JOIN (
        SELECT current_row.\`id\`, current_row.\`${columnName}\`
        FROM \`${tableName}\` current_row
        JOIN (
          SELECT \`facility_id\`, \`${columnName}\`, MIN(\`id\`) AS keep_id, COUNT(*) AS duplicate_count
          FROM \`${tableName}\`
          GROUP BY \`facility_id\`, \`${columnName}\`
          HAVING duplicate_count > 1
        ) duplicated
          ON duplicated.\`facility_id\` = current_row.\`facility_id\`
          AND duplicated.\`${columnName}\` = current_row.\`${columnName}\`
        WHERE current_row.\`id\` <> duplicated.keep_id
      ) source ON source.\`id\` = target.\`id\`
      SET target.\`${columnName}\` = CONCAT(LEFT(source.\`${columnName}\`, 29), '_', target.\`id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_rooms_status\` ON \`rooms\``);
    await queryRunner.query(`DROP INDEX \`idx_rooms_room_type_id\` ON \`rooms\``);
    await queryRunner.query(`DROP INDEX \`idx_rooms_facility_id\` ON \`rooms\``);
    await queryRunner.query(`DROP INDEX \`uq_rooms_facility_name\` ON \`rooms\``);
    await queryRunner.query(`DROP INDEX \`uq_rooms_facility_code\` ON \`rooms\``);
    await queryRunner.query(`ALTER TABLE \`rooms\` DROP COLUMN \`code\``);

    await queryRunner.query(`DROP INDEX \`idx_room_types_status\` ON \`room_types\``);
    await queryRunner.query(`DROP INDEX \`uq_room_types_name\` ON \`room_types\``);
    await queryRunner.query(`DROP INDEX \`uq_room_types_code\` ON \`room_types\``);
    await queryRunner.query(`ALTER TABLE \`room_types\` DROP COLUMN \`delete_reason\``);
    await queryRunner.query(`ALTER TABLE \`room_types\` DROP COLUMN \`deleted_by\``);
    await queryRunner.query(`ALTER TABLE \`room_types\` DROP COLUMN \`deleted_at\``);
    await queryRunner.query(`ALTER TABLE \`room_types\` DROP COLUMN \`code\``);

    await queryRunner.query(`DROP TABLE \`facility_closure_days\``);
    await queryRunner.query(`DROP TABLE \`facility_operating_hours\``);

    await queryRunner.query(`DROP INDEX \`idx_facilities_location\` ON \`facilities\``);
    await queryRunner.query(`DROP INDEX \`idx_facilities_owner_id\` ON \`facilities\``);
    await queryRunner.query(`DROP INDEX \`idx_facilities_status\` ON \`facilities\``);
    await queryRunner.query(`DROP INDEX \`uq_facilities_phone\` ON \`facilities\``);
    await queryRunner.query(`DROP INDEX \`uq_facilities_email\` ON \`facilities\``);
    await queryRunner.query(`DROP INDEX \`uq_facilities_code\` ON \`facilities\``);
    await queryRunner.query(`
      ALTER TABLE \`facilities\`
      MODIFY \`latitude\` varchar(255) NOT NULL,
      MODIFY \`longitude\` varchar(255) NOT NULL
    `);
  }
}
