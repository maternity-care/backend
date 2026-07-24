import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DropFacilityLegacyScheduleColumns1785700000000 implements MigrationInterface {
  name = 'DropFacilityLegacyScheduleColumns1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('facilities')) return;

    await this.dropColumnIfExists(queryRunner, 'working_days');
    await this.dropColumnIfExists(queryRunner, 'close_time');
    await this.dropColumnIfExists(queryRunner, 'open_time');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('facilities')) return;

    if (!await queryRunner.hasColumn('facilities', 'open_time')) {
      await queryRunner.addColumn('facilities', new TableColumn({
        name: 'open_time',
        type: 'time',
        isNullable: true,
      }));
    }

    if (!await queryRunner.hasColumn('facilities', 'close_time')) {
      await queryRunner.addColumn('facilities', new TableColumn({
        name: 'close_time',
        type: 'time',
        isNullable: true,
      }));
    }

    if (!await queryRunner.hasColumn('facilities', 'working_days')) {
      await queryRunner.addColumn('facilities', new TableColumn({
        name: 'working_days',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }
  }

  private async dropColumnIfExists(queryRunner: QueryRunner, columnName: string): Promise<void> {
    if (!await queryRunner.hasColumn('facilities', columnName)) return;
    await queryRunner.dropColumn('facilities', columnName);
  }
}
