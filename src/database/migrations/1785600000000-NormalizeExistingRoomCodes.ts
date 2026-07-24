import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeExistingRoomCodes1785600000000 implements MigrationInterface {
  name = 'NormalizeExistingRoomCodes1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasTable('rooms')) return;
    if (!await queryRunner.hasTable('facilities')) return;
    if (!await queryRunner.hasColumn('rooms', 'code')) return;

    await queryRunner.query(`UPDATE rooms SET code = CONCAT('__TMP_ROOM_CODE_', id)`);

    await queryRunner.query(`
      UPDATE rooms room
      JOIN (
        SELECT ranked.id, ranked.facility_id, ranked.sequence_number
        FROM (
          SELECT ordered.id,
                 ordered.facility_id,
                 @room_seq := IF(@current_facility = ordered.facility_id, @room_seq + 1, 1) AS sequence_number,
                 @current_facility := ordered.facility_id AS current_facility_marker
          FROM (
            SELECT id, facility_id
            FROM rooms
            ORDER BY facility_id, id
          ) ordered
          CROSS JOIN (SELECT @room_seq := 0, @current_facility := NULL) vars
        ) ranked
      ) sequence_map ON sequence_map.id = room.id
      JOIN facilities facility ON facility.id = room.facility_id
      SET room.code = CONCAT('R-', facility.code, '-', LPAD(sequence_map.sequence_number, 3, '0'))
    `);
  }

  public async down(): Promise<void> {
    // Khong rollback code da normalize vi code cu chua chuan va co chua legacy id 900xxx.
  }
}
