import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropFacilityClosureDays1786800000000 implements MigrationInterface {
  name = 'DropFacilityClosureDays1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `facility_closure_days`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`facility_closure_days\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`facility_id\` bigint NOT NULL,
        \`closure_date\` date NOT NULL,
        \`reason\` varchar(500) NULL,
        \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`idx_facility_closure_days_status\` (\`status\`),
        INDEX \`idx_facility_closure_days_facility_id\` (\`facility_id\`),
        UNIQUE INDEX \`uq_facility_closure_days_date\` (\`facility_id\`, \`closure_date\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE \`facility_closure_days\`
      ADD CONSTRAINT \`FK_c7239e7c8586752d4b500903fd2\`
      FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`)
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }
}
