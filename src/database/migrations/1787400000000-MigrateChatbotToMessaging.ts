import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateChatbotToMessaging1787400000000 implements MigrationInterface {
  name = 'MigrateChatbotToMessaging1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasChatConversations = await queryRunner.hasTable('chat_conversations');
    const hasChatMessages = await queryRunner.hasTable('chat_messages');

    await queryRunner.query(`
      INSERT INTO \`messaging_channel_accounts\` (
        \`channel\`, \`display_name\`, \`external_account_id\`, \`status\`, \`auto_start\`,
        \`credentials\`, \`credential_format\`, \`last_connected_at\`
      )
      SELECT 'web_chat', 'Website chatbot', 'web-chatbot', 'connected', 1,
        JSON_OBJECT('source', 'legacy_chatbot_migration'), 'web_chat', CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM \`messaging_channel_accounts\`
        WHERE \`channel\` = 'web_chat' AND \`external_account_id\` = 'web-chatbot'
      )
    `);

    if (hasChatConversations) {
      await queryRunner.query(`
        INSERT INTO \`messaging_conversations\` (
          \`account_id\`, \`channel\`, \`external_thread_id\`, \`external_thread_type\`,
          \`customer_name\`, \`customer_external_id\`, \`assigned_staff_id\`, \`assigned_staff_name\`,
          \`status\`, \`last_message_preview\`, \`last_message_at\`, \`unread_count\`,
          \`metadata\`, \`created_at\`, \`updated_at\`
        )
        SELECT
          account_item.id,
          'web_chat',
          CONCAT('legacy-chatbot:', chat_item.id),
          'web_chat',
          COALESCE(
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(chat_item.requester_metadata, '$.name')), ''),
            'Khách web'
          ),
          COALESCE(
            NULLIF(CAST(chat_item.user_id AS CHAR), ''),
            NULLIF(chat_item.guest_key, ''),
            CONCAT('legacy:', chat_item.id)
          ),
          CASE
            WHEN chat_item.assigned_staff_id REGEXP '^[0-9]+$' THEN CAST(chat_item.assigned_staff_id AS UNSIGNED)
            ELSE NULL
          END,
          chat_item.assigned_staff_name,
          CASE WHEN chat_item.status = 'closed' THEN 'closed' ELSE 'open' END,
          (
            SELECT COALESCE(NULLIF(message_item.content, ''), message_item.file_name,
              CASE
                WHEN message_item.message_type = 'image' THEN '[Hình ảnh]'
                WHEN message_item.message_type = 'file' THEN '[Tệp đính kèm]'
                ELSE '[Nội dung chưa hỗ trợ]'
              END
            )
            FROM \`chat_messages\` message_item
            WHERE message_item.conversation_id = chat_item.id
            ORDER BY message_item.created_at DESC, message_item.id DESC
            LIMIT 1
          ),
          (
            SELECT message_item.created_at
            FROM \`chat_messages\` message_item
            WHERE message_item.conversation_id = chat_item.id
            ORDER BY message_item.created_at DESC, message_item.id DESC
            LIMIT 1
          ),
          0,
          JSON_OBJECT(
            'source', 'web_chatbot',
            'oldChatConversationId', CAST(chat_item.id AS CHAR),
            'chatbotStatus', chat_item.chatbot_status,
            'requester', chat_item.requester_metadata,
            'guestKey', chat_item.guest_key,
            'userId', chat_item.user_id,
            'activeFacilityId', chat_item.facility_id,
            'claimExpiresAt', IF(chat_item.claim_expires_at IS NULL, NULL, DATE_FORMAT(chat_item.claim_expires_at, '%Y-%m-%dT%H:%i:%s.000Z'))
          ),
          chat_item.created_at,
          chat_item.updated_at
        FROM \`chat_conversations\` chat_item
        JOIN \`messaging_channel_accounts\` account_item
          ON account_item.channel = 'web_chat'
          AND account_item.external_account_id = 'web-chatbot'
        WHERE NOT EXISTS (
          SELECT 1 FROM \`messaging_conversations\` existing
          WHERE existing.account_id = account_item.id
            AND existing.external_thread_id = CONCAT('legacy-chatbot:', chat_item.id)
        )
      `);
    }

    if (hasChatConversations && hasChatMessages) {
      await queryRunner.query(`
        INSERT INTO \`messaging_messages\` (
          \`conversation_id\`, \`account_id\`, \`external_message_id\`, \`direction\`,
          \`sender_type\`, \`sender_id\`, \`sender_name\`, \`message_type\`, \`content\`,
          \`metadata\`, \`sent_at\`, \`read_at\`, \`created_at\`
        )
        SELECT
          conversation_item.id,
          conversation_item.account_id,
          CONCAT('legacy-chatbot-message:', message_item.id),
          CASE WHEN message_item.sender_type = 'user' THEN 'inbound' ELSE 'outbound' END,
          CASE
            WHEN message_item.sender_type = 'user' THEN 'customer'
            WHEN message_item.sender_type = 'staff' THEN 'staff'
            ELSE 'system'
          END,
          CAST(message_item.sender_id AS CHAR),
          CASE
            WHEN message_item.sender_type = 'bot' THEN 'AI hỗ trợ'
            ELSE message_item.sender_name
          END,
          CASE
            WHEN message_item.message_type IN ('text', 'image', 'file') THEN message_item.message_type
            ELSE 'text'
          END,
          message_item.content,
          JSON_OBJECT(
            'source', 'web_chatbot',
            'oldChatMessageId', CAST(message_item.id AS CHAR),
            'autoReply', IF(message_item.sender_type = 'bot', true, false),
            'attachmentUrl', message_item.file_url,
            'attachmentName', message_item.file_name,
            'attachmentMimeType', message_item.mime_type,
            'attachmentSize', message_item.file_size,
            'imageUrl', IF(message_item.message_type = 'image', message_item.file_url, NULL)
          ),
          message_item.created_at,
          message_item.read_at,
          message_item.created_at
        FROM \`chat_messages\` message_item
        JOIN \`messaging_conversations\` conversation_item
          ON JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.oldChatConversationId')) = CAST(message_item.conversation_id AS CHAR)
        WHERE conversation_item.channel = 'web_chat'
          AND NOT EXISTS (
            SELECT 1 FROM \`messaging_messages\` existing
            WHERE existing.account_id = conversation_item.account_id
              AND existing.external_message_id = CONCAT('legacy-chatbot-message:', message_item.id)
          )
      `);
    }

    if (hasChatMessages) {
      await queryRunner.query('DROP TABLE IF EXISTS `chat_messages`');
    }
    if (hasChatConversations) {
      await queryRunner.query('DROP TABLE IF EXISTS `chat_conversations`');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_conversations\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`doctor_id\` bigint NULL,
        \`facility_id\` bigint NULL,
        \`user_id\` bigint NULL,
        \`guest_key\` varchar(120) NULL,
        \`conversation_type\` varchar(255) NOT NULL DEFAULT 'chatbot',
        \`chatbot_status\` varchar(50) NOT NULL DEFAULT 'bot',
        \`assigned_staff_id\` varchar(50) NULL,
        \`assigned_staff_name\` varchar(255) NULL,
        \`claim_expires_at\` timestamp NULL,
        \`requester_metadata\` json NULL,
        \`priority\` int NOT NULL DEFAULT 0,
        \`status\` enum ('open', 'pending', 'closed') NOT NULL DEFAULT 'open',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`conversation_id\` bigint NOT NULL,
        \`sender_id\` bigint NULL,
        \`sender_type\` varchar(255) NOT NULL,
        \`sender_name\` varchar(255) NULL,
        \`message_type\` varchar(255) NOT NULL DEFAULT 'text',
        \`content\` text NULL,
        \`file_url\` varchar(500) NULL,
        \`file_name\` varchar(255) NULL,
        \`mime_type\` varchar(150) NULL,
        \`file_size\` int NULL,
        \`read_at\` timestamp NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_chat_messages_conversation_restored\`
          FOREIGN KEY (\`conversation_id\`) REFERENCES \`chat_conversations\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`chat_conversations\` (
        \`id\`, \`facility_id\`, \`user_id\`, \`guest_key\`, \`conversation_type\`,
        \`chatbot_status\`, \`assigned_staff_id\`, \`assigned_staff_name\`,
        \`claim_expires_at\`, \`requester_metadata\`, \`status\`, \`created_at\`, \`updated_at\`
      )
      SELECT
        CAST(JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.oldChatConversationId')) AS UNSIGNED),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.activeFacilityId')) AS UNSIGNED),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.userId')) AS UNSIGNED),
        JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.guestKey')),
        'chatbot',
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.chatbotStatus')), 'bot'),
        CAST(conversation_item.assigned_staff_id AS CHAR),
        conversation_item.assigned_staff_name,
        STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.claimExpiresAt')), '%Y-%m-%dT%H:%i:%s.000Z'),
        JSON_EXTRACT(conversation_item.metadata, '$.requester'),
        CASE WHEN conversation_item.status = 'closed' THEN 'closed' ELSE 'open' END,
        conversation_item.created_at,
        conversation_item.updated_at
      FROM \`messaging_conversations\` conversation_item
      WHERE conversation_item.channel = 'web_chat'
        AND JSON_EXTRACT(conversation_item.metadata, '$.oldChatConversationId') IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`chat_messages\` (
        \`id\`, \`conversation_id\`, \`sender_id\`, \`sender_type\`, \`sender_name\`,
        \`message_type\`, \`content\`, \`file_url\`, \`file_name\`, \`mime_type\`,
        \`file_size\`, \`read_at\`, \`created_at\`
      )
      SELECT
        CAST(JSON_UNQUOTE(JSON_EXTRACT(message_item.metadata, '$.oldChatMessageId')) AS UNSIGNED),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(conversation_item.metadata, '$.oldChatConversationId')) AS UNSIGNED),
        CAST(message_item.sender_id AS UNSIGNED),
        CASE
          WHEN message_item.direction = 'inbound' THEN 'user'
          WHEN JSON_EXTRACT(message_item.metadata, '$.autoReply') = true THEN 'bot'
          WHEN message_item.sender_type = 'staff' THEN 'staff'
          ELSE 'system'
        END,
        message_item.sender_name,
        CASE
          WHEN message_item.message_type IN ('text', 'image', 'file') THEN message_item.message_type
          ELSE 'text'
        END,
        message_item.content,
        JSON_UNQUOTE(JSON_EXTRACT(message_item.metadata, '$.attachmentUrl')),
        JSON_UNQUOTE(JSON_EXTRACT(message_item.metadata, '$.attachmentName')),
        JSON_UNQUOTE(JSON_EXTRACT(message_item.metadata, '$.attachmentMimeType')),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(message_item.metadata, '$.attachmentSize')) AS UNSIGNED),
        message_item.read_at,
        message_item.created_at
      FROM \`messaging_messages\` message_item
      JOIN \`messaging_conversations\` conversation_item ON conversation_item.id = message_item.conversation_id
      WHERE conversation_item.channel = 'web_chat'
        AND JSON_EXTRACT(conversation_item.metadata, '$.oldChatConversationId') IS NOT NULL
        AND JSON_EXTRACT(message_item.metadata, '$.oldChatMessageId') IS NOT NULL
    `);
  }
}
