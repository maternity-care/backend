import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateStaffAuthTokens1751200000000 implements MigrationInterface {
  name = 'CreateStaffAuthTokens1751200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const definition of [
      { table: 'staff_refresh_tokens', reset: false },
      { table: 'staff_password_reset_tokens', reset: true },
    ]) {
      await queryRunner.createTable(
        new Table({
          name: definition.table,
          columns: [
            { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'staff_id', type: 'bigint' },
            { name: 'token_hash', type: 'varchar', length: '128', isUnique: true },
            { name: 'expires_at', type: 'timestamp' },
            ...(definition.reset
              ? [{ name: 'used_at', type: 'timestamp', isNullable: true }]
              : [
                  { name: 'revoked_at', type: 'timestamp', isNullable: true },
                  { name: 'replaced_by_token_hash', type: 'varchar', length: '128', isNullable: true },
                ]),
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
          indices: [
            { name: `IDX_${definition.table.toUpperCase()}_STAFF_ID`, columnNames: ['staff_id'] },
            { name: `IDX_${definition.table.toUpperCase()}_TOKEN_HASH`, columnNames: ['token_hash'], isUnique: true },
          ],
        }),
        true,
      );
      await queryRunner.createForeignKey(
        definition.table,
        new TableForeignKey({
          columnNames: ['staff_id'],
          referencedTableName: 'staffs',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('staff_password_reset_tokens', true);
    await queryRunner.dropTable('staff_refresh_tokens', true);
  }
}
