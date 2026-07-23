import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorShiftStatus } from 'src/common/constants/status.enum';
import { Facility, Room, Staff } from 'src/database/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shifts')
export class Shift {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'slot_id', type: 'bigint' })
  slotId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'staff_id', type: 'bigint' })
  staffId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'room_id', type: 'bigint', nullable: true })
  roomId: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @ApiProperty({ type: String })
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @ApiProperty({ type: String })
  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @ApiPropertyOptional({ type: Number, nullable: true, required: false })
  @Column({ name: 'max_appointments', type: 'int', nullable: true })
  maxAppointments: number | null;

  @ApiProperty({ enum: DoctorShiftStatus, enumName: 'DoctorShiftStatus' })
  @Column({ name: 'status', type: 'enum', enum: DoctorShiftStatus })
  status: DoctorShiftStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_reason', type: 'text', nullable: true })
  deletedReason: string | null;
}
