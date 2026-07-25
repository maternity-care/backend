import { PregnancyProfile } from './../../modules/pregnancy-profile/entities/pregnancy-profile.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('health_metrics')
export class HealthMetric {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => PregnancyProfile })
  @ManyToOne(() => PregnancyProfile, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'pregnancy_profile_id' })
  pregnancyProfile: PregnancyProfile;

  @ApiProperty({ type: String })
  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'recorded_by', type: 'bigint' })
  recordedBy: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'gestational_age_weeks', type: 'int', default: 0 })
  gestationalAgeWeeks: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'weight_kg', type: 'decimal', precision: 15, scale: 2, default: 0 })
  weightKg: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'blood_pressure_systolic', type: 'int', default: 0 })
  bloodPressureSystolic: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'blood_pressure_diastolic', type: 'int', default: 0 })
  bloodPressureDiastolic: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'heart_rate', type: 'int', default: 0 })
  heartRate: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'blood_sugar', type: 'decimal', precision: 15, scale: 2, default: 0 })
  bloodSugar: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'fetal_heart_rate', type: 'int', default: 0 })
  fetalHeartRate: number;

  @ApiProperty({ type: Object })
  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: String })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
