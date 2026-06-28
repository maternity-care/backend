import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PregnancyProfileStatus } from '../../common/constants/status.enum';

@Entity('pregnancy_profiles')
export class PregnancyProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ name: 'last_menstrual_period', type: 'date', nullable: true })
  lastMenstrualPeriod: string;

  @Column({ name: 'expected_due_date', type: 'date', nullable: true })
  expectedDueDate: string;

  @Column({ name: 'gestational_age_weeks', type: 'int', nullable: true })
  gestationalAgeWeeks: number;

  @Column({ type: 'int' })
  gravida: number;

  @Column({ type: 'int' })
  para: number;

  @Column({ name: 'risk_level', type: 'varchar', length: 30 })
  riskLevel: string;

  @Column({ type: 'varchar', length: 30 })
  status: PregnancyProfileStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
