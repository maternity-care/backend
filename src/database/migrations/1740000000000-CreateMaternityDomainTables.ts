import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMaternityDomainTables1740000000000 implements MigrationInterface {
  name = 'CreateMaternityDomainTables1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
        columns: [
          {
            name: 'user_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'province',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'district',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'ward',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'emergency_contact_name',
            type: 'varchar',
            length: '150',
            isNullable: true,
          },
          {
            name: 'emergency_contact_phone',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'doctors',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'bigint',
          },
          {
            name: 'license_no',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'specialty',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'years_of_experience',
            type: 'int',
            default: 0,
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_doctors_user_id',
            columnNames: ['user_id'],
            isUnique: true,
          },
          {
            name: 'uq_doctors_license_no',
            columnNames: ['license_no'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'staff_profiles',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'bigint',
          },
          {
            name: 'employee_code',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'position',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_staff_profiles_user_id',
            columnNames: ['user_id'],
            isUnique: true,
          },
          {
            name: 'uq_staff_profiles_employee_code',
            columnNames: ['employee_code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'facilities',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '190',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'province',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'district',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'ward',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_facilities_code',
            columnNames: ['code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'rooms',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'facility_id',
            type: 'bigint',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'room_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'floor',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'facility_doctors',
        columns: [
          {
            name: 'facility_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'doctor_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'assigned_at',
            type: 'timestamp',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'facility_staff',
        columns: [
          {
            name: 'facility_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'staff_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'assigned_at',
            type: 'timestamp',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'doctor_shifts',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'doctor_id',
            type: 'bigint',
          },
          {
            name: 'facility_id',
            type: 'bigint',
          },
          {
            name: 'room_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'shift_date',
            type: 'date',
          },
          {
            name: 'start_time',
            type: 'time',
          },
          {
            name: 'end_time',
            type: 'time',
          },
          {
            name: 'max_appointments',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'services',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'service_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'default_duration_minutes',
            type: 'int',
          },
          {
            name: 'base_price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'requires_doctor_warning',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_services_code',
            columnNames: ['code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'facility_services',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'facility_id',
            type: 'bigint',
          },
          {
            name: 'service_id',
            type: 'bigint',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'duration_minutes',
            type: 'int',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_facility_services_facility_id_service_id',
            columnNames: ['facility_id', 'service_id'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'maternity_packages',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'duration_days',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'priority_level',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_maternity_packages_code',
            columnNames: ['code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_services',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'package_id',
            type: 'bigint',
          },
          {
            name: 'service_id',
            type: 'bigint',
          },
          {
            name: 'included_quantity',
            type: 'int',
          },
          {
            name: 'is_required',
            type: 'tinyint',
          },
          {
            name: 'is_optional',
            type: 'tinyint',
          },
          {
            name: 'allowed_facility_scope',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_package_services_package_id_service_id',
            columnNames: ['package_id', 'service_id'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'package_service_facilities',
        columns: [
          {
            name: 'package_service_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'facility_id',
            type: 'bigint',
            isPrimary: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'patient_packages',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'pregnancy_profile_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'package_id',
            type: 'bigint',
          },
          {
            name: 'start_date',
            type: 'date',
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'upgraded_from_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'patient_package_benefits',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patient_package_id',
            type: 'bigint',
          },
          {
            name: 'service_id',
            type: 'bigint',
          },
          {
            name: 'total_quantity',
            type: 'int',
          },
          {
            name: 'used_quantity',
            type: 'int',
            default: 0,
          },
          {
            name: 'remaining_quantity',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_patient_package_benefits_patient_package_id_service_id',
            columnNames: ['patient_package_id', 'service_id'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'patient_extra_services',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'patient_package_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'service_id',
            type: 'bigint',
          },
          {
            name: 'facility_id',
            type: 'bigint',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'pregnancy_profiles',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'date_of_birth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'last_menstrual_period',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'expected_due_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'gestational_age_weeks',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'gravida',
            type: 'int',
          },
          {
            name: 'para',
            type: 'int',
          },
          {
            name: 'risk_level',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_pregnancy_profiles_code',
            columnNames: ['code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'pregnancy_history_events',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'pregnancy_profile_id',
            type: 'bigint',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'event_date',
            type: 'timestamp',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ref_table',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'ref_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'health_metrics',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'pregnancy_profile_id',
            type: 'bigint',
          },
          {
            name: 'recorded_by',
            type: 'bigint',
          },
          {
            name: 'recorded_at',
            type: 'timestamp',
          },
          {
            name: 'weight_kg',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'blood_pressure_systolic',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'blood_pressure_diastolic',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'heart_rate',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'blood_sugar',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'fetal_heart_rate',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'appointments',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'pregnancy_profile_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'facility_id',
            type: 'bigint',
          },
          {
            name: 'room_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'doctor_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'service_id',
            type: 'bigint',
          },
          {
            name: 'patient_package_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'patient_extra_service_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'scheduled_start',
            type: 'datetime',
          },
          {
            name: 'scheduled_end',
            type: 'datetime',
          },
          {
            name: 'checked_in_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'cancel_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'no_show_handled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_appointments_code',
            columnNames: ['code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'appointment_status_logs',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'appointment_id',
            type: 'bigint',
          },
          {
            name: 'old_status',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'new_status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'changed_by',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'appointment_reminders',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'appointment_id',
            type: 'bigint',
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'scheduled_at',
            type: 'timestamp',
          },
          {
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'customer_id',
            type: 'bigint',
          },
          {
            name: 'facility_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'order_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'subtotal_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'discount_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_orders_code',
            columnNames: ['code'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'bigint',
          },
          {
            name: 'item_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'item_id',
            type: 'bigint',
          },
          {
            name: 'ref_table',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'quantity',
            type: 'int',
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'total_price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'bigint',
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'provider_transaction_id',
            type: 'varchar',
            length: '190',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'paid_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'raw_response',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'invoices',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'bigint',
          },
          {
            name: 'invoice_no',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'issued_at',
            type: 'timestamp',
          },
          {
            name: 'buyer_name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'buyer_tax_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_invoices_order_id',
            columnNames: ['order_id'],
            isUnique: true,
          },
          {
            name: 'uq_invoices_invoice_no',
            columnNames: ['invoice_no'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'refunds',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'bigint',
          },
          {
            name: 'payment_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'requested_by',
            type: 'bigint',
          },
          {
            name: 'approved_by',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_categories',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '190',
          },
          {
            name: 'parent_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_product_categories_slug',
            columnNames: ['slug'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'category_id',
            type: 'bigint',
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '190',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'ask_doctor_before_use',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_products_sku',
            columnNames: ['sku'],
            isUnique: true,
          },
          {
            name: 'uq_products_slug',
            columnNames: ['slug'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'carts',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_carts_user_id',
            columnNames: ['user_id'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'cart_id',
            type: 'bigint',
          },
          {
            name: 'product_id',
            type: 'bigint',
          },
          {
            name: 'quantity',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_cart_items_cart_id_product_id',
            columnNames: ['cart_id', 'product_id'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_orders',
        columns: [
          {
            name: 'order_id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'shipping_name',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'shipping_phone',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'shipping_address',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'shipping_status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'note',
            type: 'varchar',
            length: '500',
            isNullable: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'medical_records',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'appointment_id',
            type: 'bigint',
          },
          {
            name: 'pregnancy_profile_id',
            type: 'bigint',
          },
          {
            name: 'doctor_id',
            type: 'bigint',
          },
          {
            name: 'diagnosis',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'conclusion',
            type: 'text',
          },
          {
            name: 'recommendation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'next_appointment_suggested_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_medical_records_appointment_id',
            columnNames: ['appointment_id'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'medical_files',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'medical_record_id',
            type: 'bigint',
          },
          {
            name: 'appointment_id',
            type: 'bigint',
          },
          {
            name: 'file_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'uploaded_by',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'prescriptions',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'medical_record_id',
            type: 'bigint',
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'doctor_id',
            type: 'bigint',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'prescription_items',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'prescription_id',
            type: 'bigint',
          },
          {
            name: 'medicine_name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'dosage',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'frequency',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'duration',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'instructions',
            type: 'varchar',
            length: '500',
            isNullable: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'prescription_histories',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'prescription_id',
            type: 'bigint',
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'snapshot',
            type: 'json',
          },
          {
            name: 'changed_by',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'medication_taken_logs',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'prescription_item_id',
            type: 'bigint',
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'taken_at',
            type: 'timestamp',
          },
          {
            name: 'note',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'chat_conversations',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'facility_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'patient_id',
            type: 'bigint',
          },
          {
            name: 'assigned_user_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'conversation_type',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'priority',
            type: 'int',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'conversation_id',
            type: 'bigint',
          },
          {
            name: 'sender_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'sender_type',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'message_type',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'read_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'articles',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'author_id',
            type: 'bigint',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '250',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '250',
          },
          {
            name: 'summary',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'longtext',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'approved_by',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'published_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
        indices: [
          {
            name: 'uq_articles_slug',
            columnNames: ['slug'],
            isUnique: true,
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'faqs',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'question',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'answer',
            type: 'text',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'forum_posts',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'author_id',
            type: 'bigint',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '250',
          },
          {
            name: 'content',
            type: 'longtext',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'forum_comments',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'post_id',
            type: 'bigint',
          },
          {
            name: 'author_id',
            type: 'bigint',
          },
          {
            name: 'parent_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'content_reports',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'reporter_id',
            type: 'bigint',
          },
          {
            name: 'target_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'target_id',
            type: 'bigint',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'resolved_by',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('user_profiles', [
      new TableForeignKey({
        name: 'fk_user_profiles_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('doctors', [
      new TableForeignKey({
        name: 'fk_doctors_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('staff_profiles', [
      new TableForeignKey({
        name: 'fk_staff_profiles_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('rooms', [
      new TableForeignKey({
        name: 'fk_rooms_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('facility_doctors', [
      new TableForeignKey({
        name: 'fk_facility_doctors_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_facility_doctors_doctor_id',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('facility_staff', [
      new TableForeignKey({
        name: 'fk_facility_staff_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_facility_staff_staff_id',
        columnNames: ['staff_id'],
        referencedTableName: 'staff_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('doctor_shifts', [
      new TableForeignKey({
        name: 'fk_doctor_shifts_doctor_id',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_doctor_shifts_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_doctor_shifts_room_id',
        columnNames: ['room_id'],
        referencedTableName: 'rooms',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('facility_services', [
      new TableForeignKey({
        name: 'fk_facility_services_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_facility_services_service_id',
        columnNames: ['service_id'],
        referencedTableName: 'services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('package_services', [
      new TableForeignKey({
        name: 'fk_package_services_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'maternity_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_package_services_service_id',
        columnNames: ['service_id'],
        referencedTableName: 'services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('package_service_facilities', [
      new TableForeignKey({
        name: 'fk_package_service_facilities_package_service_id',
        columnNames: ['package_service_id'],
        referencedTableName: 'package_services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_package_service_facilities_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('patient_packages', [
      new TableForeignKey({
        name: 'fk_patient_packages_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_patient_packages_pregnancy_profile_id',
        columnNames: ['pregnancy_profile_id'],
        referencedTableName: 'pregnancy_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_patient_packages_package_id',
        columnNames: ['package_id'],
        referencedTableName: 'maternity_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_patient_packages_upgraded_from_id',
        columnNames: ['upgraded_from_id'],
        referencedTableName: 'patient_packages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('patient_package_benefits', [
      new TableForeignKey({
        name: 'fk_patient_package_benefits_patient_package_id',
        columnNames: ['patient_package_id'],
        referencedTableName: 'patient_packages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_patient_package_benefits_service_id',
        columnNames: ['service_id'],
        referencedTableName: 'services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('patient_extra_services', [
      new TableForeignKey({
        name: 'fk_patient_extra_services_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_patient_extra_services_patient_package_id',
        columnNames: ['patient_package_id'],
        referencedTableName: 'patient_packages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_patient_extra_services_service_id',
        columnNames: ['service_id'],
        referencedTableName: 'services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_patient_extra_services_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('pregnancy_profiles', [
      new TableForeignKey({
        name: 'fk_pregnancy_profiles_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('pregnancy_history_events', [
      new TableForeignKey({
        name: 'fk_pregnancy_history_events_pregnancy_profile_id',
        columnNames: ['pregnancy_profile_id'],
        referencedTableName: 'pregnancy_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_pregnancy_history_events_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('health_metrics', [
      new TableForeignKey({
        name: 'fk_health_metrics_pregnancy_profile_id',
        columnNames: ['pregnancy_profile_id'],
        referencedTableName: 'pregnancy_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_health_metrics_recorded_by',
        columnNames: ['recorded_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('appointments', [
      new TableForeignKey({
        name: 'fk_appointments_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_appointments_pregnancy_profile_id',
        columnNames: ['pregnancy_profile_id'],
        referencedTableName: 'pregnancy_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_appointments_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_appointments_room_id',
        columnNames: ['room_id'],
        referencedTableName: 'rooms',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_appointments_doctor_id',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_appointments_service_id',
        columnNames: ['service_id'],
        referencedTableName: 'services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_appointments_patient_package_id',
        columnNames: ['patient_package_id'],
        referencedTableName: 'patient_packages',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_appointments_patient_extra_service_id',
        columnNames: ['patient_extra_service_id'],
        referencedTableName: 'patient_extra_services',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_appointments_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('appointment_status_logs', [
      new TableForeignKey({
        name: 'fk_appointment_status_logs_appointment_id',
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_appointment_status_logs_changed_by',
        columnNames: ['changed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('appointment_reminders', [
      new TableForeignKey({
        name: 'fk_appointment_reminders_appointment_id',
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('orders', [
      new TableForeignKey({
        name: 'fk_orders_customer_id',
        columnNames: ['customer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_orders_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('order_items', [
      new TableForeignKey({
        name: 'fk_order_items_order_id',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('payments', [
      new TableForeignKey({
        name: 'fk_payments_order_id',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('invoices', [
      new TableForeignKey({
        name: 'fk_invoices_order_id',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('refunds', [
      new TableForeignKey({
        name: 'fk_refunds_order_id',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_refunds_payment_id',
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_refunds_requested_by',
        columnNames: ['requested_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_refunds_approved_by',
        columnNames: ['approved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('product_categories', [
      new TableForeignKey({
        name: 'fk_product_categories_parent_id',
        columnNames: ['parent_id'],
        referencedTableName: 'product_categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('products', [
      new TableForeignKey({
        name: 'fk_products_category_id',
        columnNames: ['category_id'],
        referencedTableName: 'product_categories',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('carts', [
      new TableForeignKey({
        name: 'fk_carts_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('cart_items', [
      new TableForeignKey({
        name: 'fk_cart_items_cart_id',
        columnNames: ['cart_id'],
        referencedTableName: 'carts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_cart_items_product_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('product_orders', [
      new TableForeignKey({
        name: 'fk_product_orders_order_id',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('medical_records', [
      new TableForeignKey({
        name: 'fk_medical_records_appointment_id',
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_medical_records_pregnancy_profile_id',
        columnNames: ['pregnancy_profile_id'],
        referencedTableName: 'pregnancy_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_medical_records_doctor_id',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('medical_files', [
      new TableForeignKey({
        name: 'fk_medical_files_medical_record_id',
        columnNames: ['medical_record_id'],
        referencedTableName: 'medical_records',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_medical_files_appointment_id',
        columnNames: ['appointment_id'],
        referencedTableName: 'appointments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_medical_files_uploaded_by',
        columnNames: ['uploaded_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('prescriptions', [
      new TableForeignKey({
        name: 'fk_prescriptions_medical_record_id',
        columnNames: ['medical_record_id'],
        referencedTableName: 'medical_records',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_prescriptions_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_prescriptions_doctor_id',
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('prescription_items', [
      new TableForeignKey({
        name: 'fk_prescription_items_prescription_id',
        columnNames: ['prescription_id'],
        referencedTableName: 'prescriptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('prescription_histories', [
      new TableForeignKey({
        name: 'fk_prescription_histories_prescription_id',
        columnNames: ['prescription_id'],
        referencedTableName: 'prescriptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_prescription_histories_changed_by',
        columnNames: ['changed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('medication_taken_logs', [
      new TableForeignKey({
        name: 'fk_medication_taken_logs_prescription_item_id',
        columnNames: ['prescription_item_id'],
        referencedTableName: 'prescription_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_medication_taken_logs_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('chat_conversations', [
      new TableForeignKey({
        name: 'fk_chat_conversations_facility_id',
        columnNames: ['facility_id'],
        referencedTableName: 'facilities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'fk_chat_conversations_patient_id',
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_chat_conversations_assigned_user_id',
        columnNames: ['assigned_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('chat_messages', [
      new TableForeignKey({
        name: 'fk_chat_messages_conversation_id',
        columnNames: ['conversation_id'],
        referencedTableName: 'chat_conversations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_chat_messages_sender_id',
        columnNames: ['sender_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('articles', [
      new TableForeignKey({
        name: 'fk_articles_author_id',
        columnNames: ['author_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_articles_approved_by',
        columnNames: ['approved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('forum_posts', [
      new TableForeignKey({
        name: 'fk_forum_posts_author_id',
        columnNames: ['author_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    ]);

    await queryRunner.createForeignKeys('forum_comments', [
      new TableForeignKey({
        name: 'fk_forum_comments_post_id',
        columnNames: ['post_id'],
        referencedTableName: 'forum_posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_forum_comments_author_id',
        columnNames: ['author_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_forum_comments_parent_id',
        columnNames: ['parent_id'],
        referencedTableName: 'forum_comments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);

    await queryRunner.createForeignKeys('content_reports', [
      new TableForeignKey({
        name: 'fk_content_reports_reporter_id',
        columnNames: ['reporter_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'fk_content_reports_resolved_by',
        columnNames: ['resolved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('content_reports', true);
    await queryRunner.dropTable('forum_comments', true);
    await queryRunner.dropTable('forum_posts', true);
    await queryRunner.dropTable('faqs', true);
    await queryRunner.dropTable('articles', true);
    await queryRunner.dropTable('chat_messages', true);
    await queryRunner.dropTable('chat_conversations', true);
    await queryRunner.dropTable('medication_taken_logs', true);
    await queryRunner.dropTable('prescription_histories', true);
    await queryRunner.dropTable('prescription_items', true);
    await queryRunner.dropTable('prescriptions', true);
    await queryRunner.dropTable('medical_files', true);
    await queryRunner.dropTable('medical_records', true);
    await queryRunner.dropTable('product_orders', true);
    await queryRunner.dropTable('cart_items', true);
    await queryRunner.dropTable('carts', true);
    await queryRunner.dropTable('products', true);
    await queryRunner.dropTable('product_categories', true);
    await queryRunner.dropTable('refunds', true);
    await queryRunner.dropTable('invoices', true);
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropTable('order_items', true);
    await queryRunner.dropTable('orders', true);
    await queryRunner.dropTable('appointment_reminders', true);
    await queryRunner.dropTable('appointment_status_logs', true);
    await queryRunner.dropTable('appointments', true);
    await queryRunner.dropTable('health_metrics', true);
    await queryRunner.dropTable('pregnancy_history_events', true);
    await queryRunner.dropTable('pregnancy_profiles', true);
    await queryRunner.dropTable('patient_extra_services', true);
    await queryRunner.dropTable('patient_package_benefits', true);
    await queryRunner.dropTable('patient_packages', true);
    await queryRunner.dropTable('package_service_facilities', true);
    await queryRunner.dropTable('package_services', true);
    await queryRunner.dropTable('maternity_packages', true);
    await queryRunner.dropTable('facility_services', true);
    await queryRunner.dropTable('services', true);
    await queryRunner.dropTable('doctor_shifts', true);
    await queryRunner.dropTable('facility_staff', true);
    await queryRunner.dropTable('facility_doctors', true);
    await queryRunner.dropTable('rooms', true);
    await queryRunner.dropTable('facilities', true);
    await queryRunner.dropTable('staff_profiles', true);
    await queryRunner.dropTable('doctors', true);
    await queryRunner.dropTable('user_profiles', true);
  }
}
