import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'appointment_id', type: 'bigint', unique: true })
  appointmentId: string;

  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'text' })
  conclusion: string;

  @Column({ type: 'text', nullable: true })
  recommendation: string;

  @Column({ name: 'next_appointment_suggested_at', type: 'datetime', nullable: true })
  nextAppointmentSuggestedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
