import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatbotGuestAndUploadRateLimit1785600000000 implements MigrationInterface {
  name = 'AddChatbotGuestAndUploadRateLimit1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`chat_conversations\`
      ADD COLUMN \`guest_key\` varchar(120) NULL AFTER \`user_id\`
    `);
    await queryRunner.query(`
      CREATE INDEX \`idx_chat_conversations_guest_key\`
      ON \`chat_conversations\` (\`guest_key\`)
    `);
    await queryRunner.query(`
      CREATE INDEX \`idx_chat_conversations_user_chatbot\`
      ON \`chat_conversations\` (\`user_id\`, \`conversation_type\`, \`updated_at\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_chat_conversations_user_chatbot` ON `chat_conversations`');
    await queryRunner.query('DROP INDEX `idx_chat_conversations_guest_key` ON `chat_conversations`');
    await queryRunner.query('ALTER TABLE `chat_conversations` DROP COLUMN `guest_key`');
  }
}
