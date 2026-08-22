import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentServiceItemNotificationReference1787700000000
  implements MigrationInterface
{
  name = 'AddAppointmentServiceItemNotificationReference1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY \`reference_type\` enum (
        'appointment',
        'exam',
        'appointment_service_item',
        'pregnancy_profile',
        'payment',
        'package',
        'shift_disruption',
        'forum_post',
        'forum_report'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY \`reference_type\` enum (
        'appointment',
        'exam',
        'pregnancy_profile',
        'payment',
        'package',
        'shift_disruption',
        'forum_post',
        'forum_report'
      ) NOT NULL
    `);
  }
}
