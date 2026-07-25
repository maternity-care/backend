import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateValidation1784977517026 implements MigrationInterface {
    name = 'UpdateValidation1784977517026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`forum_topics\` CHANGE \`status\` \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE \`forum_posts\` CHANGE \`author_role\` \`author_role\` varchar(255) NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE \`forum_posts\` CHANGE \`commentable\` \`commentable\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`forum_posts\` CHANGE \`status\` \`status\` enum ('published', 'hidden', 'deleted') NOT NULL DEFAULT 'published'`);
        await queryRunner.query(`ALTER TABLE \`forum_comments\` CHANGE \`parent_id\` \`parent_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_comments\` CHANGE \`message_type\` \`message_type\` varchar(255) NOT NULL DEFAULT 'text'`);
        await queryRunner.query(`ALTER TABLE \`forum_comments\` CHANGE \`status\` \`status\` enum ('published', 'hidden', 'deleted') NOT NULL DEFAULT 'published'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`forum_comments\` CHANGE \`status\` \`status\` enum ('published', 'hidden', 'deleted') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_comments\` CHANGE \`message_type\` \`message_type\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_comments\` CHANGE \`parent_id\` \`parent_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_posts\` CHANGE \`status\` \`status\` enum ('published', 'hidden', 'deleted') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_posts\` CHANGE \`commentable\` \`commentable\` tinyint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_posts\` CHANGE \`author_role\` \`author_role\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`forum_topics\` CHANGE \`status\` \`status\` enum ('active', 'inactive') NOT NULL`);
    }

}
