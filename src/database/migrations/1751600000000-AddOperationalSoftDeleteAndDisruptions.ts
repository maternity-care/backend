import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddOperationalSoftDeleteAndDisruptions1751600000000 implements MigrationInterface {
  name = 'AddOperationalSoftDeleteAndDisruptions1751600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addSoftDeleteColumns(queryRunner, 'doctor_shifts');
    await this.addSoftDeleteColumns(queryRunner, 'rooms');
    await this.addSoftDeleteColumns(queryRunner, 'facilities');

    await queryRunner.createTable(new Table({
      name: 'doctor_shift_change_logs',
      columns: [
        this.idColumn(),
        { name: 'shift_id', type: 'bigint' },
        { name: 'action', type: 'varchar', length: '50' },
        { name: 'old_status', type: 'varchar', length: '30', isNullable: true },
        { name: 'new_status', type: 'varchar', length: '30', isNullable: true },
        { name: 'old_doctor_id', type: 'bigint', isNullable: true },
        { name: 'new_doctor_id', type: 'bigint', isNullable: true },
        { name: 'old_room_id', type: 'bigint', isNullable: true },
        { name: 'new_room_id', type: 'bigint', isNullable: true },
        { name: 'old_start_time', type: 'time', isNullable: true },
        { name: 'new_start_time', type: 'time', isNullable: true },
        { name: 'old_end_time', type: 'time', isNullable: true },
        { name: 'new_end_time', type: 'time', isNullable: true },
        { name: 'reason', type: 'varchar', length: '500', isNullable: true },
        { name: 'changed_by', type: 'bigint', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    await queryRunner.createTable(new Table({
      name: 'shift_disruptions',
      columns: [
        this.idColumn(),
        { name: 'type', type: 'varchar', length: '50' },
        { name: 'source_type', type: 'varchar', length: '50' },
        { name: 'source_id', type: 'bigint' },
        { name: 'facility_id', type: 'bigint' },
        { name: 'doctor_shift_id', type: 'bigint', isNullable: true },
        { name: 'room_id', type: 'bigint', isNullable: true },
        { name: 'reason', type: 'varchar', length: '500', isNullable: true },
        { name: 'status', type: 'varchar', length: '30', default: "'open'" },
        { name: 'created_by', type: 'bigint', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'resolved_at', type: 'timestamp', isNullable: true },
      ],
    }), true);

    await queryRunner.createTable(new Table({
      name: 'appointment_disruption_items',
      columns: [
        this.idColumn(),
        { name: 'disruption_id', type: 'bigint' },
        { name: 'appointment_id', type: 'bigint' },
        { name: 'old_doctor_id', type: 'bigint', isNullable: true },
        { name: 'old_room_id', type: 'bigint', isNullable: true },
        { name: 'old_scheduled_start', type: 'datetime' },
        { name: 'old_scheduled_end', type: 'datetime' },
        { name: 'resolution_status', type: 'varchar', length: '30', default: "'pending'" },
        { name: 'selected_option', type: 'varchar', length: '50', isNullable: true },
        { name: 'resolved_by', type: 'bigint', isNullable: true },
        { name: 'resolved_at', type: 'timestamp', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    await queryRunner.createForeignKeys('doctor_shift_change_logs', [
      new TableForeignKey({
        name: 'fk_doctor_shift_change_logs_shift_id',
        columnNames: ['shift_id'],
        referencedTableName: 'doctor_shifts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_doctor_shift_change_logs_changed_by',
        columnNames: ['changed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('shift_disruptions', [
      new TableForeignKey({
        name: 'fk_shift_disruptions_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        name: 'fk_shift_disruptions_doctor_shift_id',
        columnNames: ['doctor_shift_id'],
        referencedTableName: 'doctor_shifts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_shift_disruptions_room_id',
        columnNames: ['room_id'],
        referencedTableName: 'rooms',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_shift_disruptions_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('appointment_disruption_items', [
      new TableForeignKey({
        name: 'fk_appointment_disruption_items_disruption_id',
        columnNames: ['disruption_id'],
        referencedTableName: 'shift_disruptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_appointment_disruption_items_appointment_id',
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_appointment_disruption_items_resolved_by',
        columnNames: ['resolved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('doctor_shift_change_logs', [
      new TableIndex({ name: 'idx_doctor_shift_change_logs_shift_id', columnNames: ['shift_id'] }),
    ]);
    await queryRunner.createIndices('shift_disruptions', [
      new TableIndex({ name: 'idx_shift_disruptions_source', columnNames: ['source_type', 'source_id'] }),
      new TableIndex({ name: 'idx_shift_disruptions_status', columnNames: ['status'] }),
    ]);
    await queryRunner.createIndices('appointment_disruption_items', [
      new TableIndex({ name: 'idx_appointment_disruption_items_disruption_id', columnNames: ['disruption_id'] }),
      new TableIndex({ name: 'idx_appointment_disruption_items_appointment_id', columnNames: ['appointment_id'] }),
      new TableIndex({ name: 'idx_appointment_disruption_items_resolution_status', columnNames: ['resolution_status'] }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('appointment_disruption_items', true);
    await queryRunner.dropTable('shift_disruptions', true);
    await queryRunner.dropTable('doctor_shift_change_logs', true);

    await this.dropSoftDeleteColumns(queryRunner, 'facilities');
    await this.dropSoftDeleteColumns(queryRunner, 'rooms');
    await this.dropSoftDeleteColumns(queryRunner, 'doctor_shifts');
  }

  private async addSoftDeleteColumns(queryRunner: QueryRunner, tableName: string): Promise<void> {
    for (const column of [
      new TableColumn({ name: 'deleted_at', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'deleted_by', type: 'bigint', isNullable: true }),
      new TableColumn({ name: 'delete_reason', type: 'varchar', length: '500', isNullable: true }),
    ]) {
      if (!await queryRunner.hasColumn(tableName, column.name)) {
        await queryRunner.addColumn(tableName, column);
      }
    }
  }

  private async dropSoftDeleteColumns(queryRunner: QueryRunner, tableName: string): Promise<void> {
    for (const columnName of ['delete_reason', 'deleted_by', 'deleted_at']) {
      if (await queryRunner.hasColumn(tableName, columnName)) {
        await queryRunner.dropColumn(tableName, columnName);
      }
    }
  }

  private idColumn() {
    return {
      name: 'id',
      type: 'bigint',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'increment' as const,
    };
  }
}
