import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class RestoreFacilityScopedShiftSlots1785800000000 implements MigrationInterface {
  name = 'RestoreFacilityScopedShiftSlots1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;
    if (!await queryRunner.hasTable('facilities')) return;

    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'uq_shift_slots_code');
    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'uq_shift_slots_facility_code');
    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'idx_shift_slots_facility_id');

    await this.ensureFacilityIdColumn(queryRunner);
    await this.detachShiftsFromGlobalSlots(queryRunner);
    await queryRunner.query(`DELETE FROM shift_slots WHERE facility_id IS NULL`);
    await this.seedDefaultSlotsForFacilities(queryRunner);
    await queryRunner.query(`ALTER TABLE shift_slots MODIFY facility_id bigint NOT NULL`);

    await this.createIndexIfMissing(queryRunner, 'shift_slots', new TableIndex({
      name: 'idx_shift_slots_facility_id',
      columnNames: ['facility_id'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shift_slots', new TableIndex({
      name: 'uq_shift_slots_facility_code',
      columnNames: ['facility_id', 'code'],
      isUnique: true,
    }));
    await this.createForeignKeyIfMissing(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;

    await this.dropForeignKeyIfExists(queryRunner, 'shift_slots', 'fk_shift_slots_facility_id');
    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'uq_shift_slots_facility_code');
    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'idx_shift_slots_facility_id');

    if (await queryRunner.hasColumn('shift_slots', 'facility_id')) {
      await queryRunner.query(`ALTER TABLE shift_slots MODIFY facility_id bigint NULL`);
    }
  }

  private async ensureFacilityIdColumn(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('shift_slots', 'facility_id')) {
      await queryRunner.query(`ALTER TABLE shift_slots MODIFY facility_id bigint NULL`);
      return;
    }

    await queryRunner.addColumn('shift_slots', new TableColumn({
      name: 'facility_id',
      type: 'bigint',
      isNullable: true,
    }));
  }

  private async detachShiftsFromGlobalSlots(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shifts')) return;
    if (!await queryRunner.hasColumn('shifts', 'slot_id')) return;

    await queryRunner.query(`
      UPDATE shifts
      SET slot_id = NULL
      WHERE slot_id IN (
        SELECT id
        FROM shift_slots
        WHERE facility_id IS NULL
      )
    `);
  }

  private async seedDefaultSlotsForFacilities(queryRunner: QueryRunner): Promise<void> {
    const facilityActiveWhere = await queryRunner.hasColumn('facilities', 'deleted_at')
      ? 'facility.deleted_at IS NULL'
      : '1 = 1';

    await queryRunner.query(`
      INSERT INTO shift_slots (facility_id, code, name, start_time, end_time, is_overnight, status)
      SELECT facility.id, 'MORNING', 'Ca sang', '07:00:00', '12:00:00', 0, 'active'
      FROM facilities facility
      WHERE ${facilityActiveWhere}
        AND NOT EXISTS (
          SELECT 1
          FROM shift_slots slot
          WHERE slot.facility_id = facility.id
            AND slot.code = 'MORNING'
        )
    `);

    await queryRunner.query(`
      INSERT INTO shift_slots (facility_id, code, name, start_time, end_time, is_overnight, status)
      SELECT facility.id, 'AFTERNOON', 'Ca chieu', '13:00:00', '17:00:00', 0, 'active'
      FROM facilities facility
      WHERE ${facilityActiveWhere}
        AND NOT EXISTS (
          SELECT 1
          FROM shift_slots slot
          WHERE slot.facility_id = facility.id
            AND slot.code = 'AFTERNOON'
        )
    `);

    await queryRunner.query(`
      INSERT INTO shift_slots (facility_id, code, name, start_time, end_time, is_overnight, status)
      SELECT facility.id, 'EVENING', 'Ca toi', '17:00:00', '21:00:00', 0, 'inactive'
      FROM facilities facility
      WHERE ${facilityActiveWhere}
        AND NOT EXISTS (
          SELECT 1
          FROM shift_slots slot
          WHERE slot.facility_id = facility.id
            AND slot.code = 'EVENING'
        )
    `);
  }

  private async createForeignKeyIfMissing(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('shift_slots');
    if (table?.foreignKeys.some(foreignKey => foreignKey.name === 'fk_shift_slots_facility_id')) return;

    await queryRunner.createForeignKey('shift_slots', new TableForeignKey({
      name: 'fk_shift_slots_facility_id',
      columnNames: ['facility_id'],
      referencedTableName: 'facilities',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    }));
  }

  private async createIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table?.indices.some(existingIndex => existingIndex.name === index.name)) return;

    await queryRunner.createIndex(tableName, index);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some(index => index.name === indexName)) return;

    await queryRunner.dropIndex(tableName, indexName);
  }

  private async dropForeignKeyIfExists(queryRunner: QueryRunner, tableName: string, foreignKeyName: string): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const foreignKey = table?.foreignKeys.find(existingForeignKey => existingForeignKey.name === foreignKeyName);
    if (!foreignKey) return;

    await queryRunner.dropForeignKey(tableName, foreignKey);
  }
}
