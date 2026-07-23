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
import { AppointmentStatus } from 'src/common/constants/status.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { Room } from 'src/modules/rooms/entities/room.entity';
import { Service } from 'src/modules/services/entities/service.entity';
import { Staff } from 'src/modules/staffs/entities/staff.entity';

@Entity('appointments')
export class Appointment {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ApiProperty({ type: () => Service })
  @ManyToOne(() => Service, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @ApiProperty({ type: String })
  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'room_id', type: 'bigint' })
  roomId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'patient_package_id', type: 'bigint', nullable: true })
  patientPackageId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'patient_extra_service_id', type: 'bigint', nullable: true })
  patientExtraServiceId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'scheduled_start', type: 'date' })
  scheduledStart: string;

  @ApiProperty({ type: String })
  @Column({ name: 'scheduled_end', type: 'date' })
  scheduledEnd: string;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'checked_in_at', type: 'timestamp', nullable: true })
  checkedInAt: Date | null;

  @ApiProperty({ enum: AppointmentStatus, enumName: 'AppointmentStatus' })
  @Column({ name: 'status', type: 'enum', enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @ApiProperty({ type: Date })
  @Column({ name: 'no_show_handled_at', type: 'timestamp' })
  noShowHandledAt: Date;

  @ApiProperty({ type: String })
  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: string;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
