import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('appointment_status_logs')
export class AppointmentStatuLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @Column({ name: 'old_status', type: 'varchar', length: 30, nullable: true })
  oldStatus: string;

  @Column({ name: 'new_status', type: 'varchar', length: 30 })
  newStatus: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string;

  @Column({ name: 'changed_by', type: 'bigint' })
  changedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
