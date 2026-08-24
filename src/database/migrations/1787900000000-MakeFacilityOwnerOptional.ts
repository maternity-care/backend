import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeFacilityOwnerOptional1787900000000 implements MigrationInterface {
  name = 'MakeFacilityOwnerOptional1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `facilities` MODIFY `owner_id` bigint NULL');
  }

  public async down(): Promise<void> {
    // Existing facilities may intentionally have no owner after this migration.
  }
}
