import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSoftDeleteToRbacTables1750700000000 implements MigrationInterface {
  name = 'AddSoftDeleteToRbacTables1750700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addDeletedAtColumn(queryRunner, 'users');
    await this.addDeletedAtColumn(queryRunner, 'roles');
    await this.addDeletedAtColumn(queryRunner, 'permissions');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropDeletedAtColumn(queryRunner, 'permissions');
    await this.dropDeletedAtColumn(queryRunner, 'roles');
    await this.dropDeletedAtColumn(queryRunner, 'users');
  }

  private async addDeletedAtColumn(queryRunner: QueryRunner, tableName: string): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(tableName, 'deleted_at');

    if (!hasColumn) {
      await queryRunner.addColumn(tableName, this.deletedAtColumn());
    }
  }

  private async dropDeletedAtColumn(queryRunner: QueryRunner, tableName: string): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(tableName, 'deleted_at');

    if (hasColumn) {
      await queryRunner.dropColumn(tableName, 'deleted_at');
    }
  }

  private deletedAtColumn(): TableColumn {
    return new TableColumn({
      name: 'deleted_at',
      type: 'timestamp',
      isNullable: true,
    });
  }
}
