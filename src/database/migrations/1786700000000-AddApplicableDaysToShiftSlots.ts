import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicableDaysToShiftSlots1786700000000 implements MigrationInterface {
  name = 'AddApplicableDaysToShiftSlots1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`shift_slots\`
      ADD \`applicable_days\` json NULL
    `);

    await queryRunner.query(`
      UPDATE \`shift_slots\` \`slot\`
      SET \`slot\`.\`applicable_days\` = (
        SELECT JSON_ARRAYAGG(\`hours\`.\`day_of_week\`)
        FROM \`facility_operating_hours\` \`hours\`
        WHERE \`hours\`.\`facility_id\` = \`slot\`.\`facility_id\`
          AND \`hours\`.\`is_closed\` = 0
          AND \`hours\`.\`open_time\` IS NOT NULL
          AND \`hours\`.\`close_time\` IS NOT NULL
          AND \`slot\`.\`start_time\` < \`slot\`.\`end_time\`
          AND \`slot\`.\`start_time\` >= \`hours\`.\`open_time\`
          AND \`slot\`.\`end_time\` <= \`hours\`.\`close_time\`
      )
      WHERE \`slot\`.\`applicable_days\` IS NULL
    `);

    await queryRunner.query(`
      UPDATE \`shift_slots\`
      SET \`applicable_days\` = JSON_ARRAY('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')
      WHERE \`applicable_days\` IS NULL
        OR JSON_LENGTH(\`applicable_days\`) = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`shift_slots\`
      DROP COLUMN \`applicable_days\`
    `);
  }
}
