import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentDisruptionResolutionStatus } from '../../common/constants/status.enum';

@Entity('appointment_disruption_items')
export class AppointmentDisruptionItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'disruption_id', type: 'bigint' })
  disruptionId: string;

  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @Column({ name: 'old_doctor_id', type: 'bigint', nullable: true })
  oldDoctorId: string | null;

  @Column({ name: 'old_room_id', type: 'bigint', nullable: true })
  oldRoomId: string | null;

  @Column({ name: 'old_scheduled_start', type: 'datetime' })
  oldScheduledStart: Date;

  @Column({ name: 'old_scheduled_end', type: 'datetime' })
  oldScheduledEnd: Date;

  @Column({ name: 'resolution_status', type: 'varchar', length: 30 })
  resolutionStatus: AppointmentDisruptionResolutionStatus;

  @Column({ name: 'selected_option', type: 'varchar', length: 50, nullable: true })
  selectedOption: string | null;

  @Column({ name: 'resolved_by', type: 'bigint', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
