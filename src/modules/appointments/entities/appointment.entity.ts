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
import { AppointmentStatus } from '../../../common/constants/status.enum';
import { Facility } from '../../facilities/entities/facility.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Service } from '../../services/entities/service.entity';
import { Staff } from '../../staffs/entities/staff.entity';
import { User } from '../../users/entities/user.entity';
import { DoctorShift } from '../../shifts/entities/shift.entity';

@Entity('appointments')
export class Appointment {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiPropertyOptional({ type: () => DoctorShift, nullable: true, required: false })
  @ManyToOne(() => DoctorShift, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: DoctorShift | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'shift_id', type: 'bigint', nullable: true })
  shiftId: string | null;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

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
  @Column({ name: 'pregnancy_profile_id', type: 'bigint', nullable: true })
  pregnancyProfileId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'room_id', type: 'bigint' })
  roomId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

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
  @Column({ name: 'scheduled_start', type: 'timestamp' })
  scheduledStart: string;

  @ApiProperty({ type: String })
  @Column({ name: 'scheduled_end', type: 'timestamp' })
  scheduledEnd: string;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'checked_in_at', type: 'timestamp', nullable: true })
  checkedInAt: Date | null;

  @ApiProperty({ enum: AppointmentStatus, enumName: 'AppointmentStatus' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING_PAYMENT,
  })
  status: AppointmentStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @ApiProperty({ type: Date })
  @Column({ name: 'no_show_handled_at', type: 'timestamp', nullable: true })
  noShowHandledAt: Date | null;

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
