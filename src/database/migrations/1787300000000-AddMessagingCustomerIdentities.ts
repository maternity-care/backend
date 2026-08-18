import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessagingCustomerIdentities1787300000000 implements MigrationInterface {
  name = 'AddMessagingCustomerIdentities1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`messaging_customer_identities\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NULL,
        \`channel\` varchar(50) NOT NULL,
        \`account_id\` bigint NULL,
        \`external_user_id\` varchar(191) NOT NULL,
        \`display_name\` varchar(255) NULL,
        \`phone\` varchar(20) NULL,
        \`email\` varchar(191) NULL,
        \`address\` varchar(255) NULL,
        \`metadata\` json NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`idx_msg_customer_user\` (\`user_id\`),
        INDEX \`idx_msg_customer_lookup\` (\`channel\`, \`account_id\`, \`external_user_id\`),
        UNIQUE INDEX \`uq_msg_customer_identity\` (\`channel\`, \`account_id\`, \`external_user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_msg_customer_identity_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`messaging_customer_identities\``);
  }
}
