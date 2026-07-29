import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseAppointmentTimestamps1785700000000 implements MigrationInterface {
  name = 'UseAppointmentTimestamps1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`appointments\`
      MODIFY \`scheduled_start\` timestamp NOT NULL,
      MODIFY \`scheduled_end\` timestamp NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`appointments\`
      MODIFY \`scheduled_start\` date NOT NULL,
      MODIFY \`scheduled_end\` date NOT NULL
    `);
  }
}
