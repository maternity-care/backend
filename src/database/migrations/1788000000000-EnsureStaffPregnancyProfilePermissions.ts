import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureStaffPregnancyProfilePermissions1788000000000 implements MigrationInterface {
  name = 'EnsureStaffPregnancyProfilePermissions1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      INNER JOIN permissions p
        ON p.name IN ('pregnancy.view', 'pregnancy.create')
      WHERE r.name = 'staff'
        AND NOT EXISTS (
          SELECT 1
          FROM role_permissions rp
          WHERE rp.role_id = r.id
            AND rp.permission_id = p.id
        )
    `);
  }

  public async down(): Promise<void> {
    // Data backfill only. Keep existing staff permissions on rollback.
  }
}
