import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSettingsTable1730000000000 implements MigrationInterface {
  name = 'CreateSettingsTable1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'setting_key', type: 'varchar', length: '150', isUnique: true },
          { name: 'setting_value', type: 'json' },
          { name: 'group', type: 'varchar', length: '100', default: "'general'" },
          { name: 'is_public', type: 'tinyint', default: 1 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('settings', true);
  }
}
