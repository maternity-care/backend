import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RefineFacilityScheduleAndShiftSlots1785300000000 implements MigrationInterface {
  name = 'RefineFacilityScheduleAndShiftSlots1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.makeFacilityLegacyScheduleColumnsNullable(queryRunner);
    await this.dropShiftSlotSortOrder(queryRunner);
    await this.resetAutoIncrementSafely(queryRunner, ['facilities', 'rooms', 'shifts', 'shift_slots']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.restoreShiftSlotSortOrder(queryRunner);

    if (await queryRunner.hasTable('facilities')) {
      await queryRunner.query(`
        UPDATE facilities
        SET open_time = COALESCE(open_time, '07:00:00'),
            close_time = COALESCE(close_time, '17:00:00'),
            working_days = COALESCE(working_days, 'MON,TUE,WED,THU,FRI,SAT')
      `);
      await queryRunner.query(`
        ALTER TABLE facilities
        MODIFY open_time time NOT NULL,
        MODIFY close_time time NOT NULL,
        MODIFY working_days varchar(255) NOT NULL
      `);
    }
  }

  private async makeFacilityLegacyScheduleColumnsNullable(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('facilities')) return;

    await queryRunner.query(`
      ALTER TABLE facilities
      MODIFY open_time time NULL,
      MODIFY close_time time NULL,
      MODIFY working_days varchar(255) NULL
    `);
  }

  private async dropShiftSlotSortOrder(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;
    if (!await queryRunner.hasColumn('shift_slots', 'sort_order')) return;

    await queryRunner.dropColumn('shift_slots', 'sort_order');
  }

  private async restoreShiftSlotSortOrder(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;
    if (await queryRunner.hasColumn('shift_slots', 'sort_order')) return;

    await queryRunner.addColumn('shift_slots', new TableColumn({
      name: 'sort_order',
      type: 'int',
      default: 0,
    }));
  }

  private async resetAutoIncrementSafely(queryRunner: QueryRunner, tableNames: string[]): Promise<void> {
    for (const tableName of tableNames) {
      if (!await queryRunner.hasTable(tableName)) continue;
      await queryRunner.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`);
    }
  }
}
