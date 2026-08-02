import { MigrationInterface, QueryRunner } from 'typeorm';

const forumPermissions = [
  'forum.view',
  'forum.create',
  'forum.update',
  'forum.delete',
  'forum.moderate',
  'forum_report.view',
  'forum_report.resolve',
];

export class AddForumModeration1786100000000 implements MigrationInterface {
  name = 'AddForumModeration1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('forum_topics', 'category'))) {
      await queryRunner.query(
        `ALTER TABLE \`forum_topics\` ADD \`category\` enum ('pregnancy', 'nutrition', 'postpartum', 'ask_doctor', 'booking_experience') NOT NULL DEFAULT 'pregnancy'`,
      );
    }
    if (!(await queryRunner.hasColumn('forum_topics', 'description'))) {
      await queryRunner.query(
        `ALTER TABLE \`forum_topics\` ADD \`description\` varchar(500) NULL`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`forum_posts\` MODIFY \`status\` enum ('pending', 'published', 'hidden', 'rejected', 'deleted') NOT NULL DEFAULT 'pending'`,
    );
    await this.addColumnIfMissing(
      queryRunner,
      'forum_posts',
      'category',
      `enum ('pregnancy', 'nutrition', 'postpartum', 'ask_doctor', 'booking_experience') NOT NULL DEFAULT 'pregnancy'`,
    );
    await queryRunner.query(
      `UPDATE \`forum_posts\` post INNER JOIN \`forum_topics\` topic ON topic.id = post.forum_topic_id SET post.category = topic.category`,
    );
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'cover_image_url', 'varchar(500) NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'is_pinned', 'tinyint NOT NULL DEFAULT 0');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'is_featured', 'tinyint NOT NULL DEFAULT 0');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'approved_by', 'bigint NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'approved_at', 'timestamp NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'moderated_by', 'bigint NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'moderated_at', 'timestamp NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'moderation_reason', 'text NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_posts', 'deleted_at', 'timestamp NULL');

    await queryRunner.query(
      `ALTER TABLE \`forum_comments\` MODIFY \`status\` enum ('pending', 'published', 'hidden', 'rejected', 'deleted') NOT NULL DEFAULT 'published'`,
    );
    await this.addColumnIfMissing(queryRunner, 'forum_comments', 'is_doctor_answer', 'tinyint NOT NULL DEFAULT 0');
    await this.addColumnIfMissing(queryRunner, 'forum_comments', 'moderated_by', 'bigint NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_comments', 'moderated_at', 'timestamp NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_comments', 'moderation_reason', 'text NULL');
    await this.addColumnIfMissing(queryRunner, 'forum_comments', 'deleted_at', 'timestamp NULL');

    await this.normalizeContentReportHandler(queryRunner);
    await queryRunner.query(
      `ALTER TABLE \`content_reports\` MODIFY \`target_type\` enum ('post', 'comment') NOT NULL`,
    );
    await this.addColumnIfMissing(queryRunner, 'content_reports', 'resolution_note', 'text NULL');
    await this.addColumnIfMissing(queryRunner, 'content_reports', 'resolution_action', 'varchar(50) NULL');

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`forum_moderation_logs\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`target_type\` enum ('post', 'comment') NOT NULL,
        \`target_id\` bigint NOT NULL,
        \`action\` enum ('submit', 'approve', 'hide', 'reject', 'delete', 'lock_comments', 'unlock_comments', 'pin', 'unpin', 'feature', 'unfeature', 'warn_user', 'ban_user', 'resolve_report') NOT NULL,
        \`actor_id\` bigint NOT NULL,
        \`actor_role\` varchar(50) NOT NULL,
        \`reason\` text NULL,
        \`metadata\` json NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_forum_moderation_logs_target\` (\`target_type\`, \`target_id\`),
        INDEX \`idx_forum_moderation_logs_actor\` (\`actor_id\`)
      ) ENGINE=InnoDB`,
    );

    await this.seedForumPermissions(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`forum_moderation_logs\``);
    await queryRunner.query(`ALTER TABLE \`content_reports\` DROP COLUMN \`resolution_action\``);
    await queryRunner.query(`ALTER TABLE \`content_reports\` DROP COLUMN \`resolution_note\``);
    await queryRunner.query(`ALTER TABLE \`forum_comments\` DROP COLUMN \`deleted_at\``);
    await queryRunner.query(`ALTER TABLE \`forum_comments\` DROP COLUMN \`moderation_reason\``);
    await queryRunner.query(`ALTER TABLE \`forum_comments\` DROP COLUMN \`moderated_at\``);
    await queryRunner.query(`ALTER TABLE \`forum_comments\` DROP COLUMN \`moderated_by\``);
    await queryRunner.query(`ALTER TABLE \`forum_comments\` DROP COLUMN \`is_doctor_answer\``);
    await queryRunner.query(
      `ALTER TABLE \`forum_comments\` MODIFY \`status\` enum ('published', 'hidden', 'deleted') NOT NULL DEFAULT 'published'`,
    );
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`deleted_at\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`moderation_reason\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`moderated_at\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`moderated_by\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`approved_at\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`approved_by\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`is_featured\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`is_pinned\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`cover_image_url\``);
    await queryRunner.query(`ALTER TABLE \`forum_posts\` DROP COLUMN \`category\``);
    await queryRunner.query(
      `ALTER TABLE \`forum_posts\` MODIFY \`status\` enum ('published', 'hidden', 'deleted') NOT NULL DEFAULT 'published'`,
    );
    await queryRunner.query(`ALTER TABLE \`forum_topics\` DROP COLUMN \`description\``);
    await queryRunner.query(`ALTER TABLE \`forum_topics\` DROP COLUMN \`category\``);
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    definition: string,
  ) {
    if (!(await queryRunner.hasColumn(tableName, columnName))) {
      await queryRunner.query(`ALTER TABLE \`${tableName}\` ADD \`${columnName}\` ${definition}`);
    }
  }

  private async normalizeContentReportHandler(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable('content_reports');
    const handlerIdColumn = table?.findColumnByName('handlerId');
    if (handlerIdColumn) {
      const handlerFk = table?.foreignKeys.find((fk) => fk.columnNames.includes('handlerId'));
      if (handlerFk) await queryRunner.dropForeignKey('content_reports', handlerFk);
      await queryRunner.query(
        `ALTER TABLE \`content_reports\` CHANGE \`handlerId\` \`handler_id\` bigint NULL`,
      );
      return;
    }

    if (!(await queryRunner.hasColumn('content_reports', 'handler_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`content_reports\` ADD \`handler_id\` bigint NULL`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE \`content_reports\` MODIFY \`handler_id\` bigint NULL`,
      );
    }
  }

  private async seedForumPermissions(queryRunner: QueryRunner) {
    const permissionValues = forumPermissions
      .map((permission) => `('${permission}', 'api', NOW(), NOW())`)
      .join(', ');

    await queryRunner.query(
      `INSERT IGNORE INTO \`permissions\` (\`name\`, \`guard_name\`, \`created_at\`, \`updated_at\`) VALUES ${permissionValues}`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO \`roles\` (\`name\`, \`guard_name\`, \`created_at\`, \`updated_at\`) VALUES ('moderator', 'api', NOW(), NOW())`,
    );
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT role_item.id, permission_item.id
      FROM \`roles\` role_item
      JOIN \`permissions\` permission_item ON permission_item.name IN (${forumPermissions.map((permission) => `'${permission}'`).join(', ')})
      WHERE role_item.name IN ('admin', 'moderator')
        AND NOT EXISTS (
          SELECT 1 FROM \`role_permissions\` existing
          WHERE existing.role_id = role_item.id AND existing.permission_id = permission_item.id
        )
    `);
  }
}
