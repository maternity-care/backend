import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceDoctorSelection1787600000000 implements MigrationInterface {
  name = 'AddServiceDoctorSelection1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAllowDoctorSelection = await queryRunner.hasColumn('services', 'allow_doctor_selection');
    if (!hasAllowDoctorSelection) {
      await queryRunner.query(`
        ALTER TABLE \`services\`
        ADD \`allow_doctor_selection\` tinyint(1) NOT NULL DEFAULT 0 AFTER \`requires_doctor_warning\`
      `);
    }

    const hasDoctorSpecialty = await queryRunner.hasColumn('services', 'doctor_specialty');
    if (!hasDoctorSpecialty) {
      await queryRunner.query(`
        ALTER TABLE \`services\`
        ADD \`doctor_specialty\` varchar(255) NULL AFTER \`allow_doctor_selection\`
      `);
    }

    await queryRunner.query(`
      UPDATE \`services\` service
      INNER JOIN \`service_types\` serviceType ON serviceType.id = service.service_type_id
      SET
        service.allow_doctor_selection = COALESCE(service.requires_doctor_warning, 0),
        service.doctor_specialty = CASE
          WHEN COALESCE(service.requires_doctor_warning, 0) = 0 THEN NULL
          WHEN LOWER(serviceType.code) = 'ultrasound' THEN 'Siêu âm sản khoa'
          WHEN LOWER(serviceType.code) IN ('lab_test', 'screening') THEN 'Xét nghiệm sản khoa'
          WHEN LOWER(serviceType.code) = 'procedure' THEN 'Thủ thuật sản khoa'
          ELSE 'Sản phụ khoa'
        END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasDoctorSpecialty = await queryRunner.hasColumn('services', 'doctor_specialty');
    if (hasDoctorSpecialty) {
      await queryRunner.query('ALTER TABLE `services` DROP COLUMN `doctor_specialty`');
    }

    const hasAllowDoctorSelection = await queryRunner.hasColumn('services', 'allow_doctor_selection');
    if (hasAllowDoctorSelection) {
      await queryRunner.query('ALTER TABLE `services` DROP COLUMN `allow_doctor_selection`');
    }
  }
}
