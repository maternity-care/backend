import { MigrationInterface, QueryRunner } from 'typeorm';

const staffForumPermissions = [
  'forum.view',
  'forum.create',
  'forum.update',
  'forum.delete',
  'forum.moderate',
  'forum_report.view',
  'forum_report.resolve',
];

export class AlignForumManagementPermissions1787000000000 implements MigrationInterface {
  name = 'AlignForumManagementPermissions1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT role_item.id, permission_item.id
      FROM \`roles\` role_item
      JOIN \`permissions\` permission_item
        ON permission_item.name IN (${this.quoteValues(staffForumPermissions)})
      WHERE role_item.name = 'staff'
        AND NOT EXISTS (
          SELECT 1
          FROM \`role_permissions\` existing
          WHERE existing.role_id = role_item.id
            AND existing.permission_id = permission_item.id
        )
    `);

    await queryRunner.query(`
      DELETE role_permission
      FROM \`role_permissions\` role_permission
      JOIN \`roles\` role_item ON role_item.id = role_permission.role_id
      JOIN \`permissions\` permission_item ON permission_item.id = role_permission.permission_id
      WHERE role_item.name = 'doctor'
        AND permission_item.name = 'forum.moderate'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE role_permission
      FROM \`role_permissions\` role_permission
      JOIN \`roles\` role_item ON role_item.id = role_permission.role_id
      JOIN \`permissions\` permission_item ON permission_item.id = role_permission.permission_id
      WHERE role_item.name = 'staff'
        AND permission_item.name IN (${this.quoteValues(staffForumPermissions.slice(2))})
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT role_item.id, permission_item.id
      FROM \`roles\` role_item
      JOIN \`permissions\` permission_item ON permission_item.name = 'forum.moderate'
      WHERE role_item.name = 'doctor'
        AND NOT EXISTS (
          SELECT 1
          FROM \`role_permissions\` existing
          WHERE existing.role_id = role_item.id
            AND existing.permission_id = permission_item.id
        )
    `);
  }

  private quoteValues(values: string[]): string {
    return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
  }
}
