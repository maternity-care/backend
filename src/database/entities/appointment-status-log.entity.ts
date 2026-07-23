import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppointmentStatus } from 'src/common/constants/status.enum';
import { Appointment } from './appointment.entity';

@Entity('appointment_statu_logs')
export class AppointmentStatusLog {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'changer', type: 'varchar', length: 255 })
  changer: string;

  @ApiProperty({ type: () => Appointment })
  @ManyToOne(() => Appointment, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ApiProperty({ type: String })
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @ApiProperty({ type: String })
  @Column({
    name: 'old_status',
    enum: AppointmentStatus,
    type: 'enum',
    enumName: 'AppointmentStatus',
  })
  oldStatus: AppointmentStatus;

  @ApiProperty({ type: String })
  @Column({
    name: 'new_status',
    enum: AppointmentStatus,
    type: 'enum',
    enumName: 'AppointmentStatus',
  })
  newStatus: AppointmentStatus;

  @ApiProperty({ type: String })
  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @ApiProperty({ type: String })
  @Column({ name: 'changed_by', type: 'bigint' })
  changedBy: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
