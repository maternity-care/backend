import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class SeparateUsersAndStaffs1751100000000 implements MigrationInterface {
  name = 'SeparateUsersAndStaffs1751100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameTable('staff_profiles', 'staffs');
    await queryRunner.addColumns('staffs', [
      new TableColumn({ name: 'name', type: 'varchar', length: '150', isNullable: true }),
      new TableColumn({ name: 'email', type: 'varchar', length: '190', isNullable: true }),
      new TableColumn({ name: 'phone', type: 'varchar', length: '15', isNullable: true }),
      new TableColumn({ name: 'password', type: 'varchar', length: '255', isNullable: true }),
    ]);

    await queryRunner.query(`
      UPDATE staffs s
      INNER JOIN users u ON u.id = s.user_id
      SET s.name = u.name,
          s.email = u.email,
          s.phone = u.phone,
          s.password = u.password
    `);

    await queryRunner.query(`
      INSERT INTO staffs (
        user_id, personal_email, employee_code, position, status,
        name, email, phone, password, created_at, updated_at
      )
      SELECT
        u.id, u.email, CONCAT('SA', LPAD(u.id, 8, '0')), 'super_admin', u.status,
        u.name, u.email, u.phone, u.password, u.created_at, u.updated_at
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id AND r.name = 'super_admin'
      LEFT JOIN staffs s ON s.user_id = u.id
      WHERE s.id IS NULL
    `);

    const [{ invalidCount }] = await queryRunner.query(`
      SELECT COUNT(*) AS invalidCount
      FROM staffs
      WHERE name IS NULL OR email IS NULL OR password IS NULL
    `);
    if (Number(invalidCount) > 0) {
      throw new Error('Cannot separate staffs: missing account credentials.');
    }

    await queryRunner.query(`
      ALTER TABLE staffs
        MODIFY name VARCHAR(150) NOT NULL,
        MODIFY email VARCHAR(190) NOT NULL,
        MODIFY password VARCHAR(255) NOT NULL,
        ADD CONSTRAINT UQ_STAFFS_EMAIL UNIQUE (email),
        ADD CONSTRAINT UQ_STAFFS_PHONE UNIQUE (phone)
    `);

    await queryRunner.createTable(
      new Table({
        name: 'staff_roles',
        columns: [
          { name: 'staff_id', type: 'bigint', isPrimary: true },
          { name: 'role_id', type: 'bigint', isPrimary: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKeys('staff_roles', [
      new TableForeignKey({
        name: 'FK_STAFF_ROLES_STAFF_ID',
        columnNames: ['staff_id'],
        referencedTableName: 'staffs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_STAFF_ROLES_ROLE_ID',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
    await queryRunner.query(`
      INSERT INTO staff_roles (staff_id, role_id)
      SELECT s.id, ur.role_id
      FROM staffs s
      INNER JOIN user_roles ur ON ur.user_id = s.user_id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE r.name = 'super_admin'
    `);

    const doctorsTable = await queryRunner.getTable('doctors');
    const doctorUserFk = doctorsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('user_id'),
    );
    if (doctorUserFk) {
      await queryRunner.dropForeignKey('doctors', doctorUserFk);
    }
    await queryRunner.query(`
      UPDATE doctors d
      INNER JOIN staffs s ON s.user_id = d.user_id
      SET d.user_id = s.id
    `);
    await queryRunner.renameColumn('doctors', 'user_id', 'staff_id');
    await queryRunner.createForeignKey(
      'doctors',
      new TableForeignKey({
        name: 'FK_DOCTORS_STAFF_ID',
        columnNames: ['staff_id'],
        referencedTableName: 'staffs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    const staffsTable = await queryRunner.getTable('staffs');
    const staffUserFk = staffsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('user_id'),
    );
    if (staffUserFk) {
      await queryRunner.dropForeignKey('staffs', staffUserFk);
    }

    await queryRunner.query(`
      DELETE u
      FROM users u
      INNER JOIN staffs s ON s.user_id = u.id
    `);

    await queryRunner.dropColumn('staffs', 'user_id');
  }

  public async down(): Promise<void> {
    throw new Error('SeparateUsersAndStaffs migration cannot be safely reverted.');
  }
}
