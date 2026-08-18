import { MigrationInterface, QueryRunner } from 'typeorm';

const messagingPermissions = [
  'messaging.view',
  'messaging.create',
  'messaging.update',
  'messaging.delete',
  'messaging.reply',
  'messaging.account_manage',
];

export class AddMessagingModule1787100000000 implements MigrationInterface {
  name = 'AddMessagingModule1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messaging_channel_accounts\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`channel\` varchar(50) NOT NULL,
        \`display_name\` varchar(255) NOT NULL,
        \`external_account_id\` varchar(120) NULL,
        \`status\` varchar(50) NOT NULL DEFAULT 'disconnected',
        \`auto_start\` tinyint NOT NULL DEFAULT 0,
        \`proxy_url\` varchar(500) NULL,
        \`credentials\` json NULL,
        \`credential_format\` varchar(80) NULL,
        \`last_error\` text NULL,
        \`last_connected_at\` timestamp NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`idx_msg_accounts_channel_status\` (\`channel\`, \`status\`),
        UNIQUE INDEX \`uq_msg_accounts_channel_external\` (\`channel\`, \`external_account_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messaging_conversations\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`account_id\` bigint NOT NULL,
        \`channel\` varchar(50) NOT NULL,
        \`external_thread_id\` varchar(191) NOT NULL,
        \`external_thread_type\` varchar(50) NOT NULL DEFAULT 'user',
        \`customer_name\` varchar(255) NULL,
        \`customer_external_id\` varchar(191) NULL,
        \`assigned_staff_id\` bigint NULL,
        \`assigned_staff_name\` varchar(255) NULL,
        \`status\` varchar(50) NOT NULL DEFAULT 'open',
        \`last_message_preview\` varchar(500) NULL,
        \`last_message_at\` timestamp NULL,
        \`unread_count\` int NOT NULL DEFAULT 0,
        \`metadata\` json NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`idx_msg_conversations_last_message\` (\`last_message_at\`),
        INDEX \`idx_msg_conversations_account\` (\`account_id\`),
        UNIQUE INDEX \`uq_msg_conversations_external\` (\`account_id\`, \`external_thread_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_msg_conversations_account\`
          FOREIGN KEY (\`account_id\`) REFERENCES \`messaging_channel_accounts\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messaging_messages\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`conversation_id\` bigint NOT NULL,
        \`account_id\` bigint NOT NULL,
        \`external_message_id\` varchar(191) NULL,
        \`direction\` varchar(50) NOT NULL,
        \`sender_type\` varchar(50) NOT NULL,
        \`sender_id\` varchar(191) NULL,
        \`sender_name\` varchar(255) NULL,
        \`message_type\` varchar(50) NOT NULL DEFAULT 'text',
        \`content\` text NULL,
        \`metadata\` json NULL,
        \`sent_at\` timestamp NULL,
        \`read_at\` timestamp NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`idx_msg_messages_conversation_created\` (\`conversation_id\`, \`created_at\`),
        INDEX \`idx_msg_messages_account\` (\`account_id\`),
        UNIQUE INDEX \`uq_msg_messages_external\` (\`account_id\`, \`external_message_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_msg_messages_conversation\`
          FOREIGN KEY (\`conversation_id\`) REFERENCES \`messaging_conversations\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO \`permissions\` (\`name\`, \`guard_name\`)
      SELECT permission_name, 'api'
      FROM (${this.permissionSelects()}) permission_seed
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permissions\` existing WHERE existing.name = permission_seed.permission_name
      )
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT role_item.id, permission_item.id
      FROM \`roles\` role_item
      JOIN \`permissions\` permission_item ON permission_item.name IN (${this.quoteValues(messagingPermissions)})
      WHERE role_item.name IN ('super_admin', 'admin', 'staff')
        AND NOT EXISTS (
          SELECT 1 FROM \`role_permissions\` existing
          WHERE existing.role_id = role_item.id
            AND existing.permission_id = permission_item.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE role_permission
      FROM \`role_permissions\` role_permission
      JOIN \`permissions\` permission_item ON permission_item.id = role_permission.permission_id
      WHERE permission_item.name IN (${this.quoteValues(messagingPermissions)})
    `);
    await queryRunner.query(`DELETE FROM \`permissions\` WHERE \`name\` IN (${this.quoteValues(messagingPermissions)})`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`messaging_messages\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`messaging_conversations\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`messaging_channel_accounts\``);
  }

  private permissionSelects(): string {
    return messagingPermissions
      .map((permission, index) => `SELECT '${permission}' AS permission_name${index === 0 ? '' : ''}`)
      .join(' UNION ALL ');
  }

  private quoteValues(values: string[]): string {
    return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
  }
}
