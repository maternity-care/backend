import { MigrationInterface, QueryRunner } from 'typeorm';

const defaultTags = [
  ['Kiểm hàng', '#64748b', 10],
  ['Câu hỏi', '#8b5cf6', 20],
  ['Mua hàng', '#3b82f6', 30],
  ['Đã gửi', '#10b981', 40],
  ['Hết hàng', '#0ea5e9', 50],
  ['Trả hàng', '#f43f5e', 60],
];

export class AddMessagingTags1787200000000 implements MigrationInterface {
  name = 'AddMessagingTags1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messaging_tags\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(80) NOT NULL,
        \`color\` varchar(20) NOT NULL DEFAULT '#64748b',
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`uq_messaging_tags_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messaging_conversation_tags\` (
        \`conversation_id\` bigint NOT NULL,
        \`tag_id\` bigint NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`idx_msg_conversation_tags_tag\` (\`tag_id\`),
        PRIMARY KEY (\`conversation_id\`, \`tag_id\`),
        CONSTRAINT \`fk_msg_conversation_tags_conversation\`
          FOREIGN KEY (\`conversation_id\`) REFERENCES \`messaging_conversations\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`fk_msg_conversation_tags_tag\`
          FOREIGN KEY (\`tag_id\`) REFERENCES \`messaging_tags\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    for (const [name, color, sortOrder] of defaultTags) {
      await queryRunner.query(
        `
          INSERT INTO \`messaging_tags\` (\`name\`, \`color\`, \`sort_order\`)
          SELECT ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM \`messaging_tags\` existing WHERE existing.name = ?
          )
        `,
        [name, color, sortOrder, name],
      );
    }

    await queryRunner.query(`
      INSERT IGNORE INTO \`messaging_conversation_tags\` (\`conversation_id\`, \`tag_id\`)
      SELECT conversation_item.id, tag_item.id
      FROM \`messaging_conversations\` conversation_item
      JOIN \`messaging_tags\` tag_item
      WHERE conversation_item.metadata IS NOT NULL
        AND JSON_CONTAINS(
          JSON_EXTRACT(conversation_item.metadata, '$.tags'),
          JSON_QUOTE(tag_item.name)
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`messaging_conversation_tags\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`messaging_tags\``);
  }
}
