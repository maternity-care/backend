import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePregnancyProfilesTable1751600000000 implements MigrationInterface {
  name = 'UpdatePregnancyProfilesTable1751600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE pregnancy_profiles
        ADD COLUMN fetal_count INT NOT NULL DEFAULT 1 AFTER expected_due_date,
        ADD COLUMN para_full_term TINYINT NOT NULL DEFAULT 0 AFTER gravida,
        ADD COLUMN para_premature TINYINT NOT NULL DEFAULT 0 AFTER para_full_term,
        ADD COLUMN para_abortion TINYINT NOT NULL DEFAULT 0 AFTER para_premature,
        ADD COLUMN para_living_children TINYINT NOT NULL DEFAULT 0 AFTER para_abortion,
        ADD COLUMN created_by BIGINT NULL AFTER updated_at,
        ADD COLUMN deleted_at TIMESTAMP NULL AFTER created_by,
        ADD COLUMN deleted_by BIGINT NULL AFTER deleted_at,
        ADD COLUMN deleted_reason TEXT NULL AFTER deleted_by;
      `,
    );

    await queryRunner.query(
      `UPDATE pregnancy_profiles
       SET para_full_term = COALESCE(para, 0),
           para_living_children = COALESCE(para, 0)
      `,
    );

    await queryRunner.query(
      `ALTER TABLE pregnancy_profiles
        DROP COLUMN full_name,
        DROP COLUMN date_of_birth,
        DROP COLUMN phone,
        DROP COLUMN gestational_age_weeks,
        DROP COLUMN para`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE pregnancy_profiles
        ADD COLUMN full_name VARCHAR(150) NOT NULL AFTER code,
        ADD COLUMN date_of_birth DATE NULL AFTER full_name,
        ADD COLUMN phone VARCHAR(30) NULL AFTER date_of_birth,
        ADD COLUMN gestational_age_weeks INT NULL AFTER phone,
        ADD COLUMN para INT NOT NULL DEFAULT 0 AFTER gravida;
      `,
    );

    await queryRunner.query(
      `UPDATE pregnancy_profiles
       SET para = COALESCE(para_full_term, 0) + COALESCE(para_premature, 0)
      `,
    );

    await queryRunner.query(
      `ALTER TABLE pregnancy_profiles
        DROP COLUMN fetal_count,
        DROP COLUMN para_full_term,
        DROP COLUMN para_premature,
        DROP COLUMN para_abortion,
        DROP COLUMN para_living_children,
        DROP COLUMN created_by,
        DROP COLUMN deleted_at,
        DROP COLUMN deleted_by,
        DROP COLUMN deleted_reason`,
    );
  }
}
