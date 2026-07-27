import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeFacilityLocationNullable1785300000000 implements MigrationInterface {
  name = 'MakeFacilityLocationNullable1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`facilities\`
        MODIFY \`province\` varchar(255) NULL,
        MODIFY \`ward\` varchar(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`facilities\`
      SET
        \`province\` = COALESCE(\`province\`, ''),
        \`ward\` = COALESCE(\`ward\`, '')
    `);

    await queryRunner.query(`
      ALTER TABLE \`facilities\`
        MODIFY \`province\` varchar(255) NOT NULL,
        MODIFY \`ward\` varchar(255) NOT NULL
    `);
  }
}
