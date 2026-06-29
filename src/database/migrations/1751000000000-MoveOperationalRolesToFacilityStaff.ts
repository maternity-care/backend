import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

const OPERATIONAL_ROLES = "'admin','doctor','nurse','staff'";

export class MoveOperationalRolesToFacilityStaff1751000000000
  implements MigrationInterface
{
  name = 'MoveOperationalRolesToFacilityStaff1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'facility_staff',
      new TableColumn({ name: 'role_id', type: 'bigint', isNullable: true }),
    );

    await queryRunner.query(`
      UPDATE facility_staff fs
      INNER JOIN staff_profiles sp ON sp.id = fs.staff_id
      SET fs.role_id = (
        SELECT r.id
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = sp.user_id
          AND r.name IN (${OPERATIONAL_ROLES})
        ORDER BY FIELD(r.name, 'admin', 'doctor', 'nurse', 'staff')
        LIMIT 1
      )
    `);

    const [{ unmappedCount }] = await queryRunner.query(`
      SELECT COUNT(*) AS unmappedCount
      FROM facility_staff
      WHERE role_id IS NULL
    `);
    if (Number(unmappedCount) > 0) {
      throw new Error(
        'Cannot move facility roles: one or more facility_staff assignments have no operational role.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE facility_staff
      MODIFY role_id BIGINT NOT NULL
    `);
    await queryRunner.createIndex(
      'facility_staff',
      new TableIndex({
        name: 'IDX_FACILITY_STAFF_ROLE_ID',
        columnNames: ['role_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'facility_staff',
      new TableForeignKey({
        name: 'FK_FACILITY_STAFF_ROLE_ID',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.query(`
      DELETE ur
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN (${OPERATIONAL_ROLES})
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT DISTINCT sp.user_id, fs.role_id
      FROM facility_staff fs
      INNER JOIN staff_profiles sp ON sp.id = fs.staff_id
    `);

    const table = await queryRunner.getTable('facility_staff');
    const foreignKey = table?.foreignKeys.find(
      (key) => key.name === 'FK_FACILITY_STAFF_ROLE_ID',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('facility_staff', foreignKey);
    }
    const index = table?.indices.find(
      (item) => item.name === 'IDX_FACILITY_STAFF_ROLE_ID',
    );
    if (index) {
      await queryRunner.dropIndex('facility_staff', index);
    }
    await queryRunner.dropColumn('facility_staff', 'role_id');
  }
}
