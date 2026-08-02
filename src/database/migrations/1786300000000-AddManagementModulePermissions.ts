import { MigrationInterface, QueryRunner } from 'typeorm';

const modulePermissions = [
  'facility.view',
  'facility.create',
  'facility.update',
  'facility.delete',
  'room.view',
  'room.create',
  'room.update',
  'room.delete',
  'room_type.view',
  'room_type.create',
  'room_type.update',
  'room_type.delete',
  'shift.view',
  'shift.create',
  'shift.update',
  'shift.delete',
  'shift_slot.view',
  'shift_slot.create',
  'shift_slot.update',
  'shift_slot.delete',
  'service.view',
  'service.create',
  'service.update',
  'service.delete',
];

const viewPermissions = [
  'facility.view',
  'room.view',
  'room_type.view',
  'shift.view',
  'shift_slot.view',
  'service.view',
  'service_package.view',
];

export class AddManagementModulePermissions1786300000000 implements MigrationInterface {
  name = 'AddManagementModulePermissions1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.insertPermissions(queryRunner, modulePermissions);
    await this.assignPermissions(queryRunner, ['super_admin', 'admin'], modulePermissions);
    await this.assignPermissions(queryRunner, ['doctor', 'nurse', 'staff'], viewPermissions);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permissionNames = [...new Set([...modulePermissions, ...viewPermissions])];
    const quotedPermissions = this.quoteValues(permissionNames);

    await queryRunner.query(`
      DELETE role_permission
      FROM \`role_permissions\` role_permission
      JOIN \`permissions\` permission_item ON permission_item.id = role_permission.permission_id
      WHERE permission_item.name IN (${quotedPermissions})
    `);

    await queryRunner.query(`
      DELETE FROM \`permissions\`
      WHERE \`name\` IN (${this.quoteValues(modulePermissions)})
    `);
  }

  private async insertPermissions(queryRunner: QueryRunner, permissions: string[]): Promise<void> {
    const values = permissions
      .map((permission) => `('${permission}', 'api')`)
      .join(', ');

    await queryRunner.query(
      `INSERT IGNORE INTO \`permissions\` (\`name\`, \`guard_name\`) VALUES ${values}`,
    );
  }

  private async assignPermissions(
    queryRunner: QueryRunner,
    roles: string[],
    permissions: string[],
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT role_item.id, permission_item.id
      FROM \`roles\` role_item
      JOIN \`permissions\` permission_item ON permission_item.name IN (${this.quoteValues(permissions)})
      WHERE role_item.name IN (${this.quoteValues(roles)})
        AND NOT EXISTS (
          SELECT 1 FROM \`role_permissions\` existing
          WHERE existing.role_id = role_item.id AND existing.permission_id = permission_item.id
        )
    `);
  }

  private quoteValues(values: string[]): string {
    return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
  }
}
