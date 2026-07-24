import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupLegacyShiftSlotRows1785200000000 implements MigrationInterface {
  name = 'CleanupLegacyShiftSlotRows1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('shift_slots')) return;

    const table = await queryRunner.getTable('shift_slots');
    const hasCode = table?.columns.some(column => column.name === 'code');
    const hasStatus = table?.columns.some(column => column.name === 'status');
    const hasDeletedAt = table?.columns.some(column => column.name === 'deleted_at');

    if (!hasCode || !hasStatus || !hasDeletedAt) return;

    await queryRunner.query(`
      UPDATE shift_slots
      SET status = 'inactive',
          deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
      WHERE code LIKE 'SLOT-%'
        AND deleted_at IS NULL
    `);
  }

  public async down(): Promise<void> {
    // Data cleanup khong nen tu dong rollback vi co the lam hien lai cac slot legacy bi sai nghiep vu.
  }
}
