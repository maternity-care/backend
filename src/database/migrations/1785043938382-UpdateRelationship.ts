import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRelationship1785043938382 implements MigrationInterface {
    name = 'UpdateRelationship1785043938382'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_bf808b325b190fb9049254ba55\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`IDX_5a52405b4204196bdb43525d39\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`IDX_392bbc86ea0b3d17eae4f7075a\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`IDX_8af037bbe7a48ab7887df8a3f2\` ON \`room_types\``);
        await queryRunner.query(`DROP INDEX \`IDX_20180102ff8f034e54c5812f69\` ON \`room_types\``);
        await queryRunner.query(`ALTER TABLE \`faqs\` ADD \`authorId\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`staffs\` DROP FOREIGN KEY \`FK_b9cd36ab047c15dd12087974fea\``);
        await queryRunner.query(`ALTER TABLE \`staffs\` CHANGE \`facility_id\` \`facility_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`package_items\` ADD CONSTRAINT \`FK_4af1566b499be54342efb0b96c1\` FOREIGN KEY (\`package_id\`) REFERENCES \`maternity_packages\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`package_items\` ADD CONSTRAINT \`FK_c2df3964b9d79d6bcac8736f314\` FOREIGN KEY (\`facility_service_id\`) REFERENCES \`facility_services\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`facility_services\` ADD CONSTRAINT \`FK_ca4ee9c001154988479497cd5c8\` FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`facility_services\` ADD CONSTRAINT \`FK_758a6751c5abdf37d1981964018\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`staffs\` ADD CONSTRAINT \`FK_b9cd36ab047c15dd12087974fea\` FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`staff_permissions\` ADD CONSTRAINT \`FK_7652b9d979e31bcbd9815e245d3\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staffs\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`staff_permissions\` ADD CONSTRAINT \`FK_b7acbd8bae43d59ecb133df5599\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`patient_package_benefits\` ADD CONSTRAINT \`FK_ed389c747ad669d4850ca6d4340\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_9a8a82462cab47c73d25f49261f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD CONSTRAINT \`FK_3d623662d4ee1219b23cf61e649\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`chat_conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`faqs\` ADD CONSTRAINT \`FK_5c0f299ee09db5676194b0f3d42\` FOREIGN KEY (\`authorId\`) REFERENCES \`staffs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`faqs\` DROP FOREIGN KEY \`FK_5c0f299ee09db5676194b0f3d42\``);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP FOREIGN KEY \`FK_3d623662d4ee1219b23cf61e649\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_9a8a82462cab47c73d25f49261f\``);
        await queryRunner.query(`ALTER TABLE \`patient_package_benefits\` DROP FOREIGN KEY \`FK_ed389c747ad669d4850ca6d4340\``);
        await queryRunner.query(`ALTER TABLE \`staff_permissions\` DROP FOREIGN KEY \`FK_b7acbd8bae43d59ecb133df5599\``);
        await queryRunner.query(`ALTER TABLE \`staff_permissions\` DROP FOREIGN KEY \`FK_7652b9d979e31bcbd9815e245d3\``);
        await queryRunner.query(`ALTER TABLE \`staffs\` DROP FOREIGN KEY \`FK_b9cd36ab047c15dd12087974fea\``);
        await queryRunner.query(`ALTER TABLE \`facility_services\` DROP FOREIGN KEY \`FK_758a6751c5abdf37d1981964018\``);
        await queryRunner.query(`ALTER TABLE \`facility_services\` DROP FOREIGN KEY \`FK_ca4ee9c001154988479497cd5c8\``);
        await queryRunner.query(`ALTER TABLE \`package_items\` DROP FOREIGN KEY \`FK_c2df3964b9d79d6bcac8736f314\``);
        await queryRunner.query(`ALTER TABLE \`package_items\` DROP FOREIGN KEY \`FK_4af1566b499be54342efb0b96c1\``);
        await queryRunner.query(`ALTER TABLE \`staffs\` CHANGE \`facility_id\` \`facility_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`staffs\` ADD CONSTRAINT \`FK_b9cd36ab047c15dd12087974fea\` FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`faqs\` DROP COLUMN \`authorId\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_20180102ff8f034e54c5812f69\` ON \`room_types\` (\`name\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_8af037bbe7a48ab7887df8a3f2\` ON \`room_types\` (\`code\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_392bbc86ea0b3d17eae4f7075a\` ON \`facilities\` (\`email\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5a52405b4204196bdb43525d39\` ON \`facilities\` (\`phone\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_bf808b325b190fb9049254ba55\` ON \`facilities\` (\`code\`)`);
    }

}
