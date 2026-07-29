import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatbotPersistence1785500000000 implements MigrationInterface {
  name = 'AddChatbotPersistence1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP FOREIGN KEY \`FK_d9e0577297cb4bb1753fd1b320a\``).catch(() => undefined);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP FOREIGN KEY \`FK_7f9e5689ad3d7f45172fc156fbf\``).catch(() => undefined);

    await queryRunner.query(`ALTER TABLE \`chat_conversations\` MODIFY \`doctor_id\` bigint NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` MODIFY \`facility_id\` bigint NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` MODIFY \`user_id\` bigint NULL`);

    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD \`chatbot_status\` varchar(50) NOT NULL DEFAULT 'bot'`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD \`assigned_staff_id\` varchar(50) NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD \`assigned_staff_name\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD \`claim_expires_at\` timestamp NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD \`requester_metadata\` json NULL`);

    await queryRunner.query(`ALTER TABLE \`chat_messages\` MODIFY \`sender_id\` bigint NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD \`sender_name\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD \`file_name\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD \`mime_type\` varchar(150) NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD \`file_size\` int NULL`);

    await queryRunner.query(`CREATE INDEX \`IDX_chat_messages_conversation_created_id\` ON \`chat_messages\` (\`conversation_id\`, \`created_at\`, \`id\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_chat_conversations_chatbot_status\` ON \`chat_conversations\` (\`chatbot_status\`)`);

    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD CONSTRAINT \`FK_chat_conversations_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`staffs\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`).catch(() => undefined);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` ADD CONSTRAINT \`FK_chat_conversations_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`).catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP FOREIGN KEY \`FK_chat_conversations_user\``).catch(() => undefined);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP FOREIGN KEY \`FK_chat_conversations_doctor\``).catch(() => undefined);
    await queryRunner.query(`DROP INDEX \`IDX_chat_conversations_chatbot_status\` ON \`chat_conversations\``).catch(() => undefined);
    await queryRunner.query(`DROP INDEX \`IDX_chat_messages_conversation_created_id\` ON \`chat_messages\``).catch(() => undefined);

    await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP COLUMN \`file_size\``);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP COLUMN \`mime_type\``);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP COLUMN \`file_name\``);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP COLUMN \`sender_name\``);
    await queryRunner.query(`ALTER TABLE \`chat_messages\` MODIFY \`sender_id\` bigint NOT NULL`);

    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP COLUMN \`requester_metadata\``);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP COLUMN \`claim_expires_at\``);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP COLUMN \`assigned_staff_name\``);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP COLUMN \`assigned_staff_id\``);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` DROP COLUMN \`chatbot_status\``);

    await queryRunner.query(`ALTER TABLE \`chat_conversations\` MODIFY \`user_id\` bigint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` MODIFY \`facility_id\` bigint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`chat_conversations\` MODIFY \`doctor_id\` bigint NOT NULL`);
  }
}
