import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUser1784969133454 implements MigrationInterface {
    name = 'UpdateUser1784969133454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`rooms\` CHANGE \`status\` \`status\` enum ('active', 'inactive') NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`email\` varchar(191) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`date_of_birth\` \`date_of_birth\` date NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`address\` \`address\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`province\` \`province\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`ward\` \`ward\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`status\` \`status\` enum ('inactive', 'active', 'locked') NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`emergency_contact_name\` \`emergency_contact_name\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`emergency_contact_phone\` \`emergency_contact_phone\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`revoked_at\` \`revoked_at\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`replaced_by_token_hash\` \`replaced_by_token_hash\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`staff_refresh_tokens\` CHANGE \`revoked_at\` \`revoked_at\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`staff_refresh_tokens\` CHANGE \`replaced_by_token_hash\` \`replaced_by_token_hash\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_auths\` CHANGE \`status\` \`status\` enum ('inactive', 'active', 'locked') NOT NULL DEFAULT 'active'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_auths\` CHANGE \`status\` \`status\` enum ('active', 'inactive') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`staff_refresh_tokens\` CHANGE \`replaced_by_token_hash\` \`replaced_by_token_hash\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`staff_refresh_tokens\` CHANGE \`revoked_at\` \`revoked_at\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`replaced_by_token_hash\` \`replaced_by_token_hash\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`revoked_at\` \`revoked_at\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`emergency_contact_phone\` \`emergency_contact_phone\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`emergency_contact_name\` \`emergency_contact_name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`status\` \`status\` enum ('inactive', 'active', 'locked') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`ward\` \`ward\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`province\` \`province\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`address\` \`address\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`date_of_birth\` \`date_of_birth\` date NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`email\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`rooms\` CHANGE \`status\` \`status\` enum ('active', 'inactive') NOT NULL`);
    }

}
