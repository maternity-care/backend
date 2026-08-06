import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignDoctorPregnancyCreatePermission1786500000000 implements MigrationInterface {
  name = 'AssignDoctorPregnancyCreatePermission1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO \`permissions\` (\`name\`, \`guard_name\`)
      VALUES ('pregnancy.create', 'api')
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT role_item.id, permission_item.id
      FROM \`roles\` role_item
      JOIN \`permissions\` permission_item ON permission_item.name = 'pregnancy.create'
      WHERE role_item.name = 'doctor'
        AND NOT EXISTS (
          SELECT 1 FROM \`role_permissions\` existing
          WHERE existing.role_id = role_item.id
            AND existing.permission_id = permission_item.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE role_permission
      FROM \`role_permissions\` role_permission
      JOIN \`roles\` role_item ON role_item.id = role_permission.role_id
      JOIN \`permissions\` permission_item ON permission_item.id = role_permission.permission_id
      WHERE role_item.name = 'doctor'
        AND permission_item.name = 'pregnancy.create'
    `);
  }
}
