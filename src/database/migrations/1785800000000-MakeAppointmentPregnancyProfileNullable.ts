import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAppointmentPregnancyProfileNullable1785800000000 implements MigrationInterface {
  name = 'MakeAppointmentPregnancyProfileNullable1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`appointments\`
      MODIFY \`pregnancy_profile_id\` bigint NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`appointments\`
      MODIFY \`pregnancy_profile_id\` bigint NOT NULL
    `);
  }
}
