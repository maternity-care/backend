import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class MergeFacilityDoctorsIntoFacilityStaff1750900000000
  implements MigrationInterface
{
  name = 'MergeFacilityDoctorsIntoFacilityStaff1750900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ unmappedCount }] = await queryRunner.query(`
      SELECT COUNT(*) AS unmappedCount
      FROM facility_doctors fd
      INNER JOIN doctors d ON d.id = fd.doctor_id
      LEFT JOIN staff_profiles sp ON sp.user_id = d.user_id
      WHERE sp.id IS NULL
    `);

    if (Number(unmappedCount) > 0) {
      throw new Error(
        'Cannot remove facility_doctors: one or more doctors do not have a staff_profiles record.',
      );
    }

    await queryRunner.query(`
      INSERT INTO facility_staff (facility_id, staff_id, status, assigned_at)
      SELECT fd.facility_id, sp.id, fd.status, fd.assigned_at
      FROM facility_doctors fd
      INNER JOIN doctors d ON d.id = fd.doctor_id
      INNER JOIN staff_profiles sp ON sp.user_id = d.user_id
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        assigned_at = VALUES(assigned_at)
    `);

    await queryRunner.dropTable('facility_doctors', true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'facility_doctors',
        columns: [
          { name: 'facility_id', type: 'bigint', isPrimary: true },
          { name: 'doctor_id', type: 'bigint', isPrimary: true },
          { name: 'status', type: 'varchar', length: '30' },
          { name: 'assigned_at', type: 'timestamp' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('facility_doctors', [
      new TableForeignKey({
        name: 'fk_facility_doctors_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_facility_doctors_doctor_id',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.query(`
      INSERT INTO facility_doctors (facility_id, doctor_id, status, assigned_at)
      SELECT fs.facility_id, d.id, fs.status, fs.assigned_at
      FROM facility_staff fs
      INNER JOIN staff_profiles sp ON sp.id = fs.staff_id
      INNER JOIN doctors d ON d.user_id = sp.user_id
    `);
  }
}
