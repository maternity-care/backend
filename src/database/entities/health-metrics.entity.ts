import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('health_metrics')
export class HealthMetric {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @Column({ name: 'recorded_by', type: 'bigint' })
  recordedBy: string;

  @Column({ name: 'recorded_at', type: 'timestamp' })
  recordedAt: Date;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg: string;

  @Column({ name: 'blood_pressure_systolic', type: 'int', nullable: true })
  bloodPressureSystolic: number;

  @Column({ name: 'blood_pressure_diastolic', type: 'int', nullable: true })
  bloodPressureDiastolic: number;

  @Column({ name: 'heart_rate', type: 'int', nullable: true })
  heartRate: number;

  @Column({ name: 'blood_sugar', type: 'decimal', precision: 6, scale: 2, nullable: true })
  bloodSugar: string;

  @Column({ name: 'fetal_heart_rate', type: 'int', nullable: true })
  fetalHeartRate: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
