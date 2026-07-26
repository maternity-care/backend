import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateShift1784996902937 implements MigrationInterface {
    name = 'UpdateShift1784996902937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_bf808b325b190fb9049254ba55\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`IDX_5a52405b4204196bdb43525d39\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`IDX_392bbc86ea0b3d17eae4f7075a\` ON \`facilities\``);
        await queryRunner.query(`ALTER TABLE \`facilities\` ADD UNIQUE INDEX \`IDX_bf808b325b190fb9049254ba55\` (\`code\`)`);
        await queryRunner.query(`ALTER TABLE \`facilities\` ADD UNIQUE INDEX \`IDX_5a52405b4204196bdb43525d39\` (\`phone\`)`);
        await queryRunner.query(`ALTER TABLE \`facilities\` ADD UNIQUE INDEX \`IDX_392bbc86ea0b3d17eae4f7075a\` (\`email\`)`);
        await queryRunner.query(`ALTER TABLE \`room_types\` ADD UNIQUE INDEX \`IDX_8af037bbe7a48ab7887df8a3f2\` (\`code\`)`);
        await queryRunner.query(`ALTER TABLE \`room_types\` ADD UNIQUE INDEX \`IDX_20180102ff8f034e54c5812f69\` (\`name\`)`);
        await queryRunner.query(`ALTER TABLE \`shifts\` CHANGE \`slot_id\` \`slot_id\` bigint NULL`);
        await queryRunner.query(`CREATE INDEX \`idx_facilities_location\` ON \`facilities\` (\`province\`, \`ward\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_facilities_owner_id\` ON \`facilities\` (\`owner_id\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_facilities_status\` ON \`facilities\` (\`status\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_facilities_phone\` ON \`facilities\` (\`phone\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_facilities_email\` ON \`facilities\` (\`email\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_facilities_code\` ON \`facilities\` (\`code\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_room_types_status\` ON \`room_types\` (\`status\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_room_types_name\` ON \`room_types\` (\`name\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_room_types_code\` ON \`room_types\` (\`code\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_rooms_status\` ON \`rooms\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_rooms_room_type_id\` ON \`rooms\` (\`room_type_id\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_rooms_facility_id\` ON \`rooms\` (\`facility_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_rooms_facility_name\` ON \`rooms\` (\`facility_id\`, \`name\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_rooms_facility_code\` ON \`rooms\` (\`facility_id\`, \`code\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_shift_slots_facility_code\` ON \`shift_slots\` (\`facility_id\`, \`code\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shift_slots_status\` ON \`shift_slots\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shift_slots_facility_id\` ON \`shift_slots\` (\`facility_id\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shifts_status\` ON \`shifts\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shifts_role_id\` ON \`shifts\` (\`role_id\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shifts_slot_id\` ON \`shifts\` (\`slot_id\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shifts_room_date\` ON \`shifts\` (\`room_id\`, \`shift_date\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shifts_facility_date\` ON \`shifts\` (\`facility_id\`, \`shift_date\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_shifts_staff_date\` ON \`shifts\` (\`staff_id\`, \`shift_date\`)`);
        await queryRunner.query(`ALTER TABLE \`facility_closure_days\` ADD CONSTRAINT \`FK_c7239e7c8586752d4b500903fd2\` FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`facility_operating_hours\` ADD CONSTRAINT \`FK_32f9529d5b95faf1a4ff93e947c\` FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shift_slots\` ADD CONSTRAINT \`FK_92ede4970ff9fe86f0318873172\` FOREIGN KEY (\`facility_id\`) REFERENCES \`facilities\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shifts\` ADD CONSTRAINT \`FK_ecd026c6a6740094fc2e5e5d56d\` FOREIGN KEY (\`slot_id\`) REFERENCES \`shift_slots\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shifts\` ADD CONSTRAINT \`FK_7c3f020cd465925a2fba01e5b1a\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shift_disruptions\` ADD CONSTRAINT \`FK_adfe5afcfde7d1ac37986d24839\` FOREIGN KEY (\`shift_id\`) REFERENCES \`shifts\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shift_change_logs\` ADD CONSTRAINT \`FK_b811a3fb8e9b8c6b8a84dfe957c\` FOREIGN KEY (\`shift_id\`) REFERENCES \`shifts\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shift_change_logs\` DROP FOREIGN KEY \`FK_b811a3fb8e9b8c6b8a84dfe957c\``);
        await queryRunner.query(`ALTER TABLE \`shift_disruptions\` DROP FOREIGN KEY \`FK_adfe5afcfde7d1ac37986d24839\``);
        await queryRunner.query(`ALTER TABLE \`shifts\` DROP FOREIGN KEY \`FK_7c3f020cd465925a2fba01e5b1a\``);
        await queryRunner.query(`ALTER TABLE \`shifts\` DROP FOREIGN KEY \`FK_ecd026c6a6740094fc2e5e5d56d\``);
        await queryRunner.query(`ALTER TABLE \`shift_slots\` DROP FOREIGN KEY \`FK_92ede4970ff9fe86f0318873172\``);
        await queryRunner.query(`ALTER TABLE \`facility_operating_hours\` DROP FOREIGN KEY \`FK_32f9529d5b95faf1a4ff93e947c\``);
        await queryRunner.query(`ALTER TABLE \`facility_closure_days\` DROP FOREIGN KEY \`FK_c7239e7c8586752d4b500903fd2\``);
        await queryRunner.query(`DROP INDEX \`idx_shifts_staff_date\` ON \`shifts\``);
        await queryRunner.query(`DROP INDEX \`idx_shifts_facility_date\` ON \`shifts\``);
        await queryRunner.query(`DROP INDEX \`idx_shifts_room_date\` ON \`shifts\``);
        await queryRunner.query(`DROP INDEX \`idx_shifts_slot_id\` ON \`shifts\``);
        await queryRunner.query(`DROP INDEX \`idx_shifts_role_id\` ON \`shifts\``);
        await queryRunner.query(`DROP INDEX \`idx_shifts_status\` ON \`shifts\``);
        await queryRunner.query(`DROP INDEX \`idx_shift_slots_facility_id\` ON \`shift_slots\``);
        await queryRunner.query(`DROP INDEX \`idx_shift_slots_status\` ON \`shift_slots\``);
        await queryRunner.query(`DROP INDEX \`uq_shift_slots_facility_code\` ON \`shift_slots\``);
        await queryRunner.query(`DROP INDEX \`uq_rooms_facility_code\` ON \`rooms\``);
        await queryRunner.query(`DROP INDEX \`uq_rooms_facility_name\` ON \`rooms\``);
        await queryRunner.query(`DROP INDEX \`idx_rooms_facility_id\` ON \`rooms\``);
        await queryRunner.query(`DROP INDEX \`idx_rooms_room_type_id\` ON \`rooms\``);
        await queryRunner.query(`DROP INDEX \`idx_rooms_status\` ON \`rooms\``);
        await queryRunner.query(`DROP INDEX \`uq_room_types_code\` ON \`room_types\``);
        await queryRunner.query(`DROP INDEX \`uq_room_types_name\` ON \`room_types\``);
        await queryRunner.query(`DROP INDEX \`idx_room_types_status\` ON \`room_types\``);
        await queryRunner.query(`DROP INDEX \`uq_facilities_code\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`uq_facilities_email\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`uq_facilities_phone\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`idx_facilities_status\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`idx_facilities_owner_id\` ON \`facilities\``);
        await queryRunner.query(`DROP INDEX \`idx_facilities_location\` ON \`facilities\``);
        await queryRunner.query(`ALTER TABLE \`shifts\` CHANGE \`slot_id\` \`slot_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`room_types\` DROP INDEX \`IDX_20180102ff8f034e54c5812f69\``);
        await queryRunner.query(`ALTER TABLE \`room_types\` DROP INDEX \`IDX_8af037bbe7a48ab7887df8a3f2\``);
        await queryRunner.query(`ALTER TABLE \`facilities\` DROP INDEX \`IDX_392bbc86ea0b3d17eae4f7075a\``);
        await queryRunner.query(`ALTER TABLE \`facilities\` DROP INDEX \`IDX_5a52405b4204196bdb43525d39\``);
        await queryRunner.query(`ALTER TABLE \`facilities\` DROP INDEX \`IDX_bf808b325b190fb9049254ba55\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_392bbc86ea0b3d17eae4f7075a\` ON \`facilities\` (\`email\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_5a52405b4204196bdb43525d39\` ON \`facilities\` (\`phone\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_bf808b325b190fb9049254ba55\` ON \`facilities\` (\`code\`)`);
    }

}
