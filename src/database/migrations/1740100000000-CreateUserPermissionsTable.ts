import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateUserPermissionsTable1740100000000 implements MigrationInterface {
  name = 'CreateUserPermissionsTable1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_permissions',
        columns: [
          { name: 'user_id', type: 'bigint', isPrimary: true },
          { name: 'permission_id', type: 'bigint', isPrimary: true },
          { name: 'effect', type: 'varchar', length: '10' },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          { name: 'IDX_USER_PERMISSIONS_USER_ID', columnNames: ['user_id'] },
          { name: 'IDX_USER_PERMISSIONS_PERMISSION_ID', columnNames: ['permission_id'] },
          { name: 'IDX_USER_PERMISSIONS_EFFECT', columnNames: ['effect'] },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('user_permissions', [
      new TableForeignKey({
        name: 'FK_USER_PERMISSIONS_USER_ID',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_USER_PERMISSIONS_PERMISSION_ID',
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_permissions', true);
  }
}
