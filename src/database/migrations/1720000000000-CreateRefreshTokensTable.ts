import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateRefreshTokensTable1720000000000 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
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
          { name: 'revoked_at', type: 'timestamp', isNullable: true },
          { name: 'replaced_by_token_hash', type: 'varchar', length: '128', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          { name: 'IDX_REFRESH_TOKENS_USER_ID', columnNames: ['user_id'] },
          { name: 'IDX_REFRESH_TOKENS_TOKEN_HASH', columnNames: ['token_hash'], isUnique: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens', true);
  }
}
