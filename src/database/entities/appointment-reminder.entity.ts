import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { ReminderStatus } from 'src/common/constants/status.enum';

@Entity('appointment_reminders')
export class AppointmentReminder {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Appointment })
  @ManyToOne(() => Appointment, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ApiProperty({ type: String })
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'channel', type: 'varchar', length: 50 })
  channel: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @ApiProperty({ enum: ReminderStatus, enumName: 'ReminderStatus' })
  @Column({ name: 'status', type: 'enum', enum: ReminderStatus })
  status: ReminderStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
