import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePasswordResetTokensTable1750800000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokensTable1750800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'user_id', type: 'bigint' },
          { name: 'token_hash', type: 'varchar', length: '128', isUnique: true },
          { name: 'expires_at', type: 'timestamp' },
          { name: 'used_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          { name: 'IDX_PASSWORD_RESET_TOKENS_USER_ID', columnNames: ['user_id'] },
          {
            name: 'IDX_PASSWORD_RESET_TOKENS_TOKEN_HASH',
            columnNames: ['token_hash'],
            isUnique: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'password_reset_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('password_reset_tokens', true);
  }
}
