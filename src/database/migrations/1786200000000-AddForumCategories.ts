import { MigrationInterface, QueryRunner } from 'typeorm';

const forumCategories = [
  {
    code: 'pregnancy',
    name: 'Thai kỳ',
    description: 'Trao đổi kinh nghiệm và câu hỏi trong thai kỳ.',
    sortOrder: 1,
  },
  {
    code: 'nutrition',
    name: 'Dinh dưỡng',
    description: 'Dinh dưỡng cho mẹ bầu, sau sinh và chăm sóc sức khỏe.',
    sortOrder: 2,
  },
  {
    code: 'postpartum',
    name: 'Sau sinh',
    description: 'Chăm sóc mẹ và bé sau sinh.',
    sortOrder: 3,
  },
  {
    code: 'ask_doctor',
    name: 'Hỏi bác sĩ',
    description: 'Câu hỏi cần bác sĩ hoặc nhân viên y tế hỗ trợ.',
    sortOrder: 4,
  },
  {
    code: 'booking_experience',
    name: 'Kinh nghiệm đặt lịch',
    description: 'Kinh nghiệm đặt lịch, đi khám và sử dụng dịch vụ.',
    sortOrder: 5,
  },
];

export class AddForumCategories1786200000000 implements MigrationInterface {
  name = 'AddForumCategories1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`forum_categories\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`code\` varchar(50) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`description\` varchar(500) NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`idx_forum_categories_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    const values = forumCategories
      .map((category) => `('${category.code}', '${category.name}', '${category.description}', ${category.sortOrder}, 'active', NOW(), NOW())`)
      .join(', ');

    await queryRunner.query(`
      INSERT INTO \`forum_categories\`
        (\`code\`, \`name\`, \`description\`, \`sort_order\`, \`status\`, \`created_at\`, \`updated_at\`)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`description\` = VALUES(\`description\`),
        \`sort_order\` = VALUES(\`sort_order\`),
        \`updated_at\` = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`forum_categories\``);
  }
}
