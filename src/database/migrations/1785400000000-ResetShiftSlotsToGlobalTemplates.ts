import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetShiftSlotsToGlobalTemplates1785400000000 implements MigrationInterface {
  name = 'ResetShiftSlotsToGlobalTemplates1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;

    await this.detachExistingShiftsFromLegacySlots(queryRunner);
    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'uq_shift_slots_facility_code');
    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'idx_shift_slots_facility_id');

    await queryRunner.query(`DELETE FROM shift_slots`);

    if (await queryRunner.hasColumn('shift_slots', 'facility_id')) {
      await queryRunner.query(`ALTER TABLE shift_slots DROP COLUMN facility_id`);
    }

    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'uq_shift_slots_code');
    await queryRunner.query(`ALTER TABLE shift_slots AUTO_INCREMENT = 1`);

    await queryRunner.query(`
      INSERT INTO shift_slots (code, name, start_time, end_time, is_overnight, status)
      VALUES
        ('MORNING', 'Ca sáng', '07:00:00', '12:00:00', 0, 'active'),
        ('AFTERNOON', 'Ca chiều', '13:00:00', '17:00:00', 0, 'active'),
        ('EVENING', 'Ca tối', '17:00:00', '21:00:00', 0, 'active')
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_shift_slots_code ON shift_slots (code)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;

    await this.dropIndexIfExists(queryRunner, 'shift_slots', 'uq_shift_slots_code');
    if (!await queryRunner.hasColumn('shift_slots', 'facility_id')) {
      await queryRunner.query(`ALTER TABLE shift_slots ADD facility_id bigint NULL`);
    }
    await queryRunner.query(`CREATE UNIQUE INDEX uq_shift_slots_facility_code ON shift_slots (facility_id, code)`);
    await queryRunner.query(`CREATE INDEX idx_shift_slots_facility_id ON shift_slots (facility_id)`);
  }

  private async detachExistingShiftsFromLegacySlots(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shifts')) return;
    if (!await queryRunner.hasColumn('shifts', 'slot_id')) return;

    await queryRunner.query(`UPDATE shifts SET slot_id = NULL WHERE slot_id IS NOT NULL`);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some(index => index.name === indexName)) return;

    await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
  }
}
