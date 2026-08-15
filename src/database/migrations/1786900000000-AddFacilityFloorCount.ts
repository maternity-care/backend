import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacilityFloorCount1786900000000 implements MigrationInterface {
  name = 'AddFacilityFloorCount1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `facilities` ADD `floor_count` int NULL DEFAULT 1',
    );
    await queryRunner.query(
      'UPDATE `rooms` ' +
      "SET `floor` = REGEXP_REPLACE(`floor`, '[^0-9]', '') " +
      "WHERE `floor` REGEXP '[0-9]'",
    );
    await queryRunner.query(
      'UPDATE `facilities` facility ' +
      'LEFT JOIN (' +
      'SELECT `facility_id`, MAX(CAST(`floor` AS UNSIGNED)) AS `highest_floor` ' +
      'FROM `rooms` ' +
      "WHERE `deleted_at` IS NULL AND `floor` REGEXP '^[1-9][0-9]*$' " +
      'GROUP BY `facility_id`' +
      ') room_floor ON room_floor.`facility_id` = facility.`id` ' +
      'SET facility.`floor_count` = GREATEST(1, COALESCE(room_floor.`highest_floor`, 1))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `facilities` DROP COLUMN `floor_count`');
  }
}
