import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PrescriptionStatus } from '../../common/constants/status.enum';

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'medical_record_id', type: 'bigint' })
  medicalRecordId: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @Column({ type: 'varchar', length: 30 })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
