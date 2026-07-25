import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateArchitectureDatabase1784909630560 implements MigrationInterface {
    name = 'UpdateArchitectureDatabase1784909630560'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`staff_permissions\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`staff_id\` bigint NOT NULL, \`permission_id\` bigint NOT NULL, \`effect\` enum ('allow', 'deny') NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`staff_permissions\``);
    }

}
