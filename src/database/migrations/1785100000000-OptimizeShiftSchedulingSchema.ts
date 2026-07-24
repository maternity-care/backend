import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class OptimizeShiftSchedulingSchema1785100000000 implements MigrationInterface {
  name = 'OptimizeShiftSchedulingSchema1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureShiftSlotsTable(queryRunner);
    await this.ensureShiftSlotsColumns(queryRunner);
    await this.ensureShiftSlotsIndexes(queryRunner);
    await this.seedGlobalShiftSlots(queryRunner);

    await this.ensureShiftsColumns(queryRunner);
    await this.ensureShiftsIndexes(queryRunner);
    await this.ensureShiftsForeignKeys(queryRunner);

    await this.ensureGenericShiftChangeLogs(queryRunner);
    await this.ensureShiftDisruptionsShape(queryRunner);
    await this.ensureAppointmentDisruptionItemsShape(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(queryRunner, 'shifts', 'idx_shifts_slot_id');
    await this.dropIndexIfExists(queryRunner, 'shifts', 'idx_shifts_role_id');
    await this.dropIndexIfExists(queryRunner, 'shifts', 'idx_shifts_staff_date');
    await this.dropIndexIfExists(queryRunner, 'shifts', 'idx_shifts_facility_date');
    await this.dropIndexIfExists(queryRunner, 'shifts', 'idx_shifts_room_date');
    await this.dropIndexIfExists(queryRunner, 'shifts', 'idx_shifts_status');

    await this.dropForeignKeyIfExists(queryRunner, 'shifts', 'fk_shifts_slot_id');
    await this.dropForeignKeyIfExists(queryRunner, 'shifts', 'fk_shifts_role_id');

    if (await this.hasColumn(queryRunner, 'shifts', 'note')) {
      await queryRunner.dropColumn('shifts', 'note');
    }
    if (await this.hasColumn(queryRunner, 'shifts', 'role_id')) {
      await queryRunner.dropColumn('shifts', 'role_id');
    }

    if (await queryRunner.hasTable('shift_change_logs') && !await queryRunner.hasTable('doctor_shift_change_logs')) {
      await queryRunner.renameTable('shift_change_logs', 'doctor_shift_change_logs');
    }
  }

  private async ensureShiftSlotsTable(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('shift_slots')) return;

    await queryRunner.createTable(new Table({
      name: 'shift_slots',
      columns: [
        { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'facility_id', type: 'bigint', isNullable: true },
        { name: 'code', type: 'varchar', length: '50', isNullable: false },
        { name: 'name', type: 'varchar', length: '255', isNullable: false },
        { name: 'start_time', type: 'time', isNullable: false },
        { name: 'end_time', type: 'time', isNullable: false },
        { name: 'is_overnight', type: 'tinyint', default: 0 },
        { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'" },
        { name: 'sort_order', type: 'int', default: 0 },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'deleted_at', type: 'timestamp', isNullable: true },
      ],
    }), true);
  }

  private async ensureShiftSlotsColumns(queryRunner: QueryRunner): Promise<void> {
    if (!await this.hasColumn(queryRunner, 'shift_slots', 'code')) {
      await queryRunner.addColumn('shift_slots', new TableColumn({
        name: 'code',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }));
      await queryRunner.query(`UPDATE shift_slots SET code = CONCAT('SLOT-', id) WHERE code IS NULL OR code = ''`);
      await queryRunner.changeColumn('shift_slots', 'code', new TableColumn({
        name: 'code',
        type: 'varchar',
        length: '50',
        isNullable: false,
      }));
    }

    if (await this.hasColumn(queryRunner, 'shift_slots', 'facility_id')) {
      await queryRunner.query(`ALTER TABLE shift_slots MODIFY facility_id bigint NULL`);
    } else {
      await queryRunner.addColumn('shift_slots', new TableColumn({
        name: 'facility_id',
        type: 'bigint',
        isNullable: true,
      }));
    }

    if (!await this.hasColumn(queryRunner, 'shift_slots', 'is_overnight')) {
      await queryRunner.addColumn('shift_slots', new TableColumn({
        name: 'is_overnight',
        type: 'tinyint',
        default: 0,
      }));
    }
    if (!await this.hasColumn(queryRunner, 'shift_slots', 'status')) {
      await queryRunner.addColumn('shift_slots', new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['active', 'inactive'],
        default: "'active'",
      }));
    }
    if (!await this.hasColumn(queryRunner, 'shift_slots', 'sort_order')) {
      await queryRunner.addColumn('shift_slots', new TableColumn({
        name: 'sort_order',
        type: 'int',
        default: 0,
      }));
    }
    if (!await this.hasColumn(queryRunner, 'shift_slots', 'deleted_at')) {
      await queryRunner.addColumn('shift_slots', new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
      }));
    }
  }

  private async ensureShiftSlotsIndexes(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfMissing(queryRunner, 'shift_slots', new TableIndex({
      name: 'idx_shift_slots_facility_id',
      columnNames: ['facility_id'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shift_slots', new TableIndex({
      name: 'idx_shift_slots_status',
      columnNames: ['status'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shift_slots', new TableIndex({
      name: 'uq_shift_slots_facility_code',
      columnNames: ['facility_id', 'code'],
      isUnique: true,
    }));
  }

  private async seedGlobalShiftSlots(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO shift_slots (facility_id, code, name, start_time, end_time, is_overnight, status, sort_order)
      SELECT NULL, 'MORNING', 'Ca sang', '07:00:00', '12:00:00', 0, 'active', 1
      WHERE NOT EXISTS (SELECT 1 FROM shift_slots WHERE facility_id IS NULL AND code = 'MORNING')
    `);
    await queryRunner.query(`
      INSERT INTO shift_slots (facility_id, code, name, start_time, end_time, is_overnight, status, sort_order)
      SELECT NULL, 'AFTERNOON', 'Ca chieu', '13:00:00', '17:00:00', 0, 'active', 2
      WHERE NOT EXISTS (SELECT 1 FROM shift_slots WHERE facility_id IS NULL AND code = 'AFTERNOON')
    `);
    await queryRunner.query(`
      INSERT INTO shift_slots (facility_id, code, name, start_time, end_time, is_overnight, status, sort_order)
      SELECT NULL, 'EVENING', 'Ca toi', '17:00:00', '21:00:00', 0, 'active', 3
      WHERE NOT EXISTS (SELECT 1 FROM shift_slots WHERE facility_id IS NULL AND code = 'EVENING')
    `);
  }

  private async ensureShiftsColumns(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'shifts', 'slot_id')) {
      await queryRunner.query(`ALTER TABLE shifts MODIFY slot_id bigint NULL`);
      await queryRunner.query(`
        UPDATE shifts
        SET slot_id = NULL
        WHERE slot_id IS NOT NULL
          AND slot_id NOT IN (SELECT id FROM shift_slots)
      `);
    } else {
      await queryRunner.addColumn('shifts', new TableColumn({
        name: 'slot_id',
        type: 'bigint',
        isNullable: true,
      }));
    }

    if (!await this.hasColumn(queryRunner, 'shifts', 'role_id')) {
      await queryRunner.addColumn('shifts', new TableColumn({
        name: 'role_id',
        type: 'bigint',
        isNullable: true,
      }));
    }
    if (!await this.hasColumn(queryRunner, 'shifts', 'note')) {
      await queryRunner.addColumn('shifts', new TableColumn({
        name: 'note',
        type: 'text',
        isNullable: true,
      }));
    }
  }

  private async ensureShiftsIndexes(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfMissing(queryRunner, 'shifts', new TableIndex({
      name: 'idx_shifts_slot_id',
      columnNames: ['slot_id'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shifts', new TableIndex({
      name: 'idx_shifts_role_id',
      columnNames: ['role_id'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shifts', new TableIndex({
      name: 'idx_shifts_staff_date',
      columnNames: ['staff_id', 'shift_date'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shifts', new TableIndex({
      name: 'idx_shifts_facility_date',
      columnNames: ['facility_id', 'shift_date'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shifts', new TableIndex({
      name: 'idx_shifts_room_date',
      columnNames: ['room_id', 'shift_date'],
    }));
    await this.createIndexIfMissing(queryRunner, 'shifts', new TableIndex({
      name: 'idx_shifts_status',
      columnNames: ['status'],
    }));
  }

  private async ensureShiftsForeignKeys(queryRunner: QueryRunner): Promise<void> {
    await this.createForeignKeyIfMissing(queryRunner, 'shifts', new TableForeignKey({
      name: 'fk_shifts_slot_id',
      columnNames: ['slot_id'],
      referencedTableName: 'shift_slots',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));
    await this.createForeignKeyIfMissing(queryRunner, 'shifts', new TableForeignKey({
      name: 'fk_shifts_role_id',
      columnNames: ['role_id'],
      referencedTableName: 'roles',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));
  }

  private async ensureGenericShiftChangeLogs(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_change_logs') && await queryRunner.hasTable('doctor_shift_change_logs')) {
      await queryRunner.renameTable('doctor_shift_change_logs', 'shift_change_logs');
    }
    if (!await queryRunner.hasTable('shift_change_logs')) {
      await queryRunner.createTable(new Table({
        name: 'shift_change_logs',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'shift_id', type: 'bigint', isNullable: false },
          { name: 'action', type: 'varchar', length: '255', isNullable: false },
          { name: 'old_status', type: 'varchar', length: '255', isNullable: true },
          { name: 'new_status', type: 'varchar', length: '255', isNullable: true },
          { name: 'old_staff_id', type: 'bigint', isNullable: true },
          { name: 'new_staff_id', type: 'bigint', isNullable: true },
          { name: 'old_room_id', type: 'bigint', isNullable: true },
          { name: 'new_room_id', type: 'bigint', isNullable: true },
          { name: 'old_start_time', type: 'time', isNullable: true },
          { name: 'new_start_time', type: 'time', isNullable: true },
          { name: 'old_end_time', type: 'time', isNullable: true },
          { name: 'new_end_time', type: 'time', isNullable: true },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'changed_by', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }), true);
    }

    if (await this.hasColumn(queryRunner, 'shift_change_logs', 'old_doctor_id') && !await this.hasColumn(queryRunner, 'shift_change_logs', 'old_staff_id')) {
      await queryRunner.renameColumn('shift_change_logs', 'old_doctor_id', 'old_staff_id');
    }
    if (await this.hasColumn(queryRunner, 'shift_change_logs', 'new_doctor_id') && !await this.hasColumn(queryRunner, 'shift_change_logs', 'new_staff_id')) {
      await queryRunner.renameColumn('shift_change_logs', 'new_doctor_id', 'new_staff_id');
    }
    if (await this.hasColumn(queryRunner, 'shift_change_logs', 'change_by') && !await this.hasColumn(queryRunner, 'shift_change_logs', 'changed_by')) {
      await queryRunner.renameColumn('shift_change_logs', 'change_by', 'changed_by');
    }
    await this.createIndexIfMissing(queryRunner, 'shift_change_logs', new TableIndex({
      name: 'idx_shift_change_logs_shift_id',
      columnNames: ['shift_id'],
    }));
    await this.createForeignKeyIfMissing(queryRunner, 'shift_change_logs', new TableForeignKey({
      name: 'fk_shift_change_logs_shift_id',
      columnNames: ['shift_id'],
      referencedTableName: 'shifts',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    }));
  }

  private async ensureShiftDisruptionsShape(queryRunner: QueryRunner): Promise<void> {
    if (!await this.hasColumn(queryRunner, 'shift_disruptions', 'shift_id')) {
      await queryRunner.addColumn('shift_disruptions', new TableColumn({
        name: 'shift_id',
        type: 'bigint',
        isNullable: true,
      }));
      if (await this.hasColumn(queryRunner, 'shift_disruptions', 'doctor_shift_id')) {
        await queryRunner.query(`UPDATE shift_disruptions SET shift_id = doctor_shift_id WHERE shift_id IS NULL`);
      }
      if (await this.hasColumn(queryRunner, 'shift_disruptions', 'shiftId')) {
        await queryRunner.query(`UPDATE shift_disruptions SET shift_id = shiftId WHERE shift_id IS NULL`);
        await queryRunner.query(`ALTER TABLE shift_disruptions MODIFY shiftId bigint NULL`);
      }
    }
    if (!await this.hasColumn(queryRunner, 'shift_disruptions', 'staff_id')) {
      await queryRunner.addColumn('shift_disruptions', new TableColumn({
        name: 'staff_id',
        type: 'bigint',
        isNullable: true,
      }));
    }
    await this.createIndexIfMissing(queryRunner, 'shift_disruptions', new TableIndex({
      name: 'idx_shift_disruptions_shift_id',
      columnNames: ['shift_id'],
    }));
    await this.createForeignKeyIfMissing(queryRunner, 'shift_disruptions', new TableForeignKey({
      name: 'fk_shift_disruptions_shift_id',
      columnNames: ['shift_id'],
      referencedTableName: 'shifts',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    }));
  }

  private async ensureAppointmentDisruptionItemsShape(queryRunner: QueryRunner): Promise<void> {
    if (!await this.hasColumn(queryRunner, 'appointment_disruption_items', 'old_staff_id')) {
      await queryRunner.addColumn('appointment_disruption_items', new TableColumn({
        name: 'old_staff_id',
        type: 'bigint',
        isNullable: true,
      }));
      if (await this.hasColumn(queryRunner, 'appointment_disruption_items', 'old_doctor_id')) {
        await queryRunner.query(`UPDATE appointment_disruption_items SET old_staff_id = old_doctor_id WHERE old_staff_id IS NULL`);
      }
    }
  }

  private async hasColumn(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
    const table = await queryRunner.getTable(tableName);
    return Boolean(table?.findColumnByName(columnName));
  }

  private async createIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table?.indices.some(existing =>
      existing.name === index.name
      || (
        existing.columnNames.join(',') === index.columnNames.join(',')
        && existing.isUnique === index.isUnique
      ),
    )) return;
    await queryRunner.createIndex(tableName, index);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const index = table?.indices.find(existing => existing.name === indexName);
    if (index) await queryRunner.dropIndex(tableName, index);
  }

  private async createForeignKeyIfMissing(queryRunner: QueryRunner, tableName: string, foreignKey: TableForeignKey): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (table?.foreignKeys.some(existing =>
      existing.name === foreignKey.name
      || (
        existing.columnNames.join(',') === foreignKey.columnNames.join(',')
        && existing.referencedTableName === foreignKey.referencedTableName
        && existing.referencedColumnNames.join(',') === foreignKey.referencedColumnNames.join(',')
      ),
    )) return;
    await queryRunner.createForeignKey(tableName, foreignKey);
  }

  private async dropForeignKeyIfExists(queryRunner: QueryRunner, tableName: string, foreignKeyName: string): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const foreignKey = table?.foreignKeys.find(existing => existing.name === foreignKeyName);
    if (foreignKey) await queryRunner.dropForeignKey(tableName, foreignKey);
  }
}
