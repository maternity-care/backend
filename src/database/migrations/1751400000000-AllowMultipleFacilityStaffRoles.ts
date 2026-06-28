import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleFacilityStaffRoles1751400000000
  implements MigrationInterface
{
  name = 'AllowMultipleFacilityStaffRoles1751400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE facility_staff
      DROP PRIMARY KEY,
      ADD PRIMARY KEY (facility_id, staff_id, role_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE duplicate_role
      FROM facility_staff duplicate_role
      INNER JOIN facility_staff retained_role
        ON retained_role.facility_id = duplicate_role.facility_id
        AND retained_role.staff_id = duplicate_role.staff_id
        AND retained_role.role_id < duplicate_role.role_id
    `);
    await queryRunner.query(`
      ALTER TABLE facility_staff
      DROP PRIMARY KEY,
      ADD PRIMARY KEY (facility_id, staff_id)
    `);
  }
}
