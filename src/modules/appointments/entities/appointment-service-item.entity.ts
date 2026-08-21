import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { FacilityService } from '../../facility-services/entities/facility-service.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Service } from '../../services/entities/service.entity';
import { Staff } from '../../staffs/entities/staff.entity';

export enum AppointmentServiceItemStatus {
  ORDERED = 'ordered',
  CHECKED_IN = 'checked_in',
  WAITING = 'waiting',
  CALLED = 'called',
  IN_PROGRESS = 'in_progress',
  WAITING_RESULT = 'waiting_result',
  RESULT_UPLOADED = 'result_uploaded',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('appointment_service_items')
export class AppointmentServiceItem {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Appointment })
  @ManyToOne(() => Appointment, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @ApiProperty({ type: String })
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId: string;

  @ApiProperty({ type: () => Service })
  @ManyToOne(() => Service, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @ApiProperty({ type: String })
  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ApiPropertyOptional({ type: () => FacilityService, nullable: true })
  @ManyToOne(() => FacilityService, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'facility_service_id' })
  facilityService: FacilityService | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'facility_service_id', type: 'bigint', nullable: true })
  facilityServiceId: string | null;

  @ApiPropertyOptional({ type: () => Staff, nullable: true })
  @ManyToOne(() => Staff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'doctor_id', type: 'bigint', nullable: true })
  doctorId: string | null;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ApiProperty({ type: String })
  @Column({ name: 'room_id', type: 'bigint' })
  roomId: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'sequence', type: 'int', default: 1 })
  sequence: number;

  @ApiProperty({ enum: AppointmentServiceItemStatus, enumName: 'AppointmentServiceItemStatus' })
  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: AppointmentServiceItemStatus.ORDERED,
  })
  status: AppointmentServiceItemStatus;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'checked_in_at', type: 'timestamp', nullable: true })
  checkedInAt: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'called_at', type: 'timestamp', nullable: true })
  calledAt: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'result_expected_at', type: 'timestamp', nullable: true })
  resultExpectedAt: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'result_uploaded_at', type: 'timestamp', nullable: true })
  resultUploadedAt: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
