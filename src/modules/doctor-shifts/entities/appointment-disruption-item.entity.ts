import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShiftDisruption } from './shift-disruption.entity';
import { AppointmentDisruptionResolutionStatus } from 'src/common/constants/status.enum';

@Entity('appointment_disruption_items')
export class AppointmentDisruptionItem {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => ShiftDisruption })
  @ManyToOne(() => ShiftDisruption, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'disruption_id' })
  shiftDisruption: ShiftDisruption;

  @ApiProperty({ type: String })
  @Column({ name: 'disruption_id', type: 'bigint' })
  disruptionId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_doctor_id', type: 'bigint', nullable: true })
  oldDoctorId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_room_id', type: 'bigint', nullable: true })
  oldRoomId: string | null;

  @ApiProperty({ type: Date })
  @Column({ name: 'old_scheduled_start', type: 'timestamp' })
  oldScheduledStart: Date;

  @ApiProperty({ type: Date })
  @Column({ name: 'old_scheduled_end', type: 'timestamp' })
  oldScheduledEnd: Date;

  @ApiProperty({
    enum: AppointmentDisruptionResolutionStatus,
    enumName: 'AppointmentDisruptionItemResolutionStatusEnum',
  })
  @Column({ name: 'resolution_status', type: 'enum', enum: AppointmentDisruptionResolutionStatus })
  resolutionStatus: AppointmentDisruptionResolutionStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'selected_option', type: 'varchar', length: 255, nullable: true })
  selectedOption: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'resolved_by', type: 'bigint', nullable: true })
  resolvedBy: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
