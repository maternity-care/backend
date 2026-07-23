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
import { PregnancyProfile } from 'src/modules/pregnancy-profile/entities/pregnancy-profile.entity';

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
  @Column({ name: 'gestational_age_weeks', type: 'int' })
  gestationalAgeWeeks: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'weight_kg', type: 'int' })
  weightKg: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'blood_pressure_systolic', type: 'int' })
  bloodPressureSystolic: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'blood_pressure_diastolic', type: 'int' })
  bloodPressureDiastolic: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'heart_rate', type: 'int' })
  heartRate: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'blood_sugar', type: 'int' })
  bloodSugar: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'fetal_heart_rate', type: 'int' })
  fetalHeartRate: number;

  @ApiProperty({ type: Object })
  @Column({ name: 'metadata', type: 'json' })
  metadata: Record<string, unknown>;

  @ApiProperty({ type: String })
  @Column({ name: 'notes', type: 'text' })
  notes: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
