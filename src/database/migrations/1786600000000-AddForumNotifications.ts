import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForumNotifications1786600000000 implements MigrationInterface {
  name = 'AddForumNotifications1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        MODIFY \`type\` enum ('appointment','reminder','exam_result','pregnancy_profile','payment','package','system','appointment_disruption','forum') NOT NULL,
        MODIFY \`reference_type\` enum ('appointment','exam','pregnancy_profile','payment','package','shift_disruption','forum_post','forum_report') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications\`
      WHERE \`type\` = 'forum'
         OR \`reference_type\` IN ('forum_post', 'forum_report')
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        MODIFY \`type\` enum ('appointment','reminder','exam_result','pregnancy_profile','payment','package','system','appointment_disruption') NOT NULL,
        MODIFY \`reference_type\` enum ('appointment','exam','pregnancy_profile','payment','package','shift_disruption') NOT NULL
    `);
  }
}
