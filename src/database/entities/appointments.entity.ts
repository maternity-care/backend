import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ name: 'pregnancy_profile_id', type: 'bigint', nullable: true })
  pregnancyProfileId: string;

  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @Column({ name: 'room_id', type: 'bigint', nullable: true })
  roomId: string;

  @Column({ name: 'doctor_id', type: 'bigint', nullable: true })
  doctorId: string;

  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @Column({ name: 'patient_package_id', type: 'bigint', nullable: true })
  patientPackageId: string;

  @Column({ name: 'patient_extra_service_id', type: 'bigint', nullable: true })
  patientExtraServiceId: string;

  @Column({ name: 'scheduled_start', type: 'datetime' })
  scheduledStart: Date;

  @Column({ name: 'scheduled_end', type: 'datetime' })
  scheduledEnd: Date;

  @Column({ name: 'checked_in_at', type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true })
  cancelReason: string;

  @Column({ name: 'no_show_handled_at', type: 'timestamp', nullable: true })
  noShowHandledAt: Date;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
