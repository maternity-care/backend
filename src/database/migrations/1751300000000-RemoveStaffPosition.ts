import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveStaffPosition1751300000000 implements MigrationInterface {
  name = 'RemoveStaffPosition1751300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('staffs', 'position');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'staffs',
      new TableColumn({
        name: 'position',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }
}
