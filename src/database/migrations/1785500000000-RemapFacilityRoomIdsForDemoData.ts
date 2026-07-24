import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemapFacilityRoomIdsForDemoData1785500000000 implements MigrationInterface {
  name = 'RemapFacilityRoomIdsForDemoData1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.remapFacilities(queryRunner);
    await this.remapRooms(queryRunner);
    await this.resetAutoIncrementSafely(queryRunner, ['facilities', 'rooms']);
  }

  public async down(): Promise<void> {
    // Demo data cleanup khong rollback primary key de tranh lam sai cac foreign key moi phat sinh sau migration.
  }

  private async remapFacilities(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('facilities')) return;

    await queryRunner.query(`DROP TEMPORARY TABLE IF EXISTS tmp_facility_id_map`);
    await queryRunner.query(`
      CREATE TEMPORARY TABLE tmp_facility_id_map (
        old_id bigint NOT NULL PRIMARY KEY,
        new_id bigint NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`SET @facility_seq := 0`);
    await queryRunner.query(`
      INSERT INTO tmp_facility_id_map (old_id, new_id)
      SELECT id, (@facility_seq := @facility_seq + 1) AS new_id
      FROM facilities
      ORDER BY id
    `);

    const facilityReferenceTables = await this.findTablesWithColumn(queryRunner, 'facility_id', ['facilities']);

    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
    for (const tableName of facilityReferenceTables) {
      await queryRunner.query(`
        UPDATE \`${tableName}\` target
        JOIN tmp_facility_id_map map ON target.\`facility_id\` = map.old_id
        SET target.\`facility_id\` = map.new_id
      `);
    }
    await queryRunner.query(`
      UPDATE facilities facility
      JOIN tmp_facility_id_map map ON facility.id = map.old_id
      SET facility.id = map.new_id
    `);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);

    await queryRunner.query(`DROP TEMPORARY TABLE IF EXISTS tmp_facility_id_map`);
  }

  private async remapRooms(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('rooms')) return;

    await queryRunner.query(`DROP TEMPORARY TABLE IF EXISTS tmp_room_id_map`);
    await queryRunner.query(`
      CREATE TEMPORARY TABLE tmp_room_id_map (
        old_id bigint NOT NULL PRIMARY KEY,
        new_id bigint NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`SET @room_seq := 0`);
    await queryRunner.query(`
      INSERT INTO tmp_room_id_map (old_id, new_id)
      SELECT id, (@room_seq := @room_seq + 1) AS new_id
      FROM rooms
      ORDER BY facility_id, id
    `);

    const roomReferenceTables = await this.findTablesWithColumn(queryRunner, 'room_id', ['rooms']);

    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
    for (const tableName of roomReferenceTables) {
      await queryRunner.query(`
        UPDATE \`${tableName}\` target
        JOIN tmp_room_id_map map ON target.\`room_id\` = map.old_id
        SET target.\`room_id\` = map.new_id
      `);
    }
    await queryRunner.query(`
      UPDATE rooms room
      JOIN tmp_room_id_map map ON room.id = map.old_id
      SET room.id = map.new_id
    `);
    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);

    await queryRunner.query(`DROP TEMPORARY TABLE IF EXISTS tmp_room_id_map`);
  }

  private async findTablesWithColumn(
    queryRunner: QueryRunner,
    columnName: string,
    excludedTables: string[],
  ): Promise<string[]> {
    const rows = await queryRunner.query(`
      SELECT TABLE_NAME AS tableName
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND COLUMN_NAME = ?
        AND TABLE_NAME NOT IN (${excludedTables.map(() => '?').join(',')})
      ORDER BY TABLE_NAME
    `, [columnName, ...excludedTables]) as Array<{ tableName: string }>;

    return rows.map(row => row.tableName);
  }

  private async resetAutoIncrementSafely(queryRunner: QueryRunner, tableNames: string[]): Promise<void> {
    for (const tableName of tableNames) {
      if (!await queryRunner.hasTable(tableName)) continue;
      await queryRunner.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`);
    }
  }
}
