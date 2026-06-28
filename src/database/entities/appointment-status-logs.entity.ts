import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppointmentStatus } from '../../common/constants/status.enum';

@Entity('appointment_status_logs')
export class AppointmentStatuLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @Column({ name: 'old_status', type: 'varchar', length: 30, nullable: true })
  oldStatus: AppointmentStatus;

  @Column({ name: 'new_status', type: 'varchar', length: 30 })
  newStatus: AppointmentStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string;

  @Column({ name: 'changed_by', type: 'bigint' })
  changedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
