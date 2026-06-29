import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActiveStatus } from '../../common/constants/status.enum';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'service_type', type: 'varchar', length: 50 })
  serviceType: string;

  @Column({ name: 'default_duration_minutes', type: 'int' })
  defaultDurationMinutes: number;

  @Column({ name: 'base_price', type: 'decimal', precision: 15, scale: 2 })
  basePrice: string;

  @Column({ name: 'requires_doctor_warning', type: 'boolean', default: false })
  requiresDoctorWarning: number;

  @Column({ type: 'varchar', length: 30 })
  status: ActiveStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
