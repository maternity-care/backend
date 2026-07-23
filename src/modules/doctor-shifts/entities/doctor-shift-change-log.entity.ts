import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Shift } from './shift.entity';

@Entity('doctor_shift_change_logs')
export class DoctorShiftChangeLog {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Shift })
  @ManyToOne(() => Shift, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({ type: String })
  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'action', type: 'varchar', length: 255 })
  action: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_status', type: 'varchar', length: 255, nullable: true })
  oldStatus: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'new_status', type: 'varchar', length: 255, nullable: true })
  newStatus: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_doctor_id', type: 'bigint', nullable: true })
  oldDoctorId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'new_doctor_id', type: 'bigint', nullable: true })
  newDoctorId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_room_id', type: 'bigint', nullable: true })
  oldRoomId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'new_room_id', type: 'bigint', nullable: true })
  newRoomId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_start_time', type: 'time', nullable: true })
  oldStartTime: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'new_start_time', type: 'time', nullable: true })
  newStartTime: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'old_end_time', type: 'time', nullable: true })
  oldEndTime: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'new_end_time', type: 'time', nullable: true })
  newEndTime: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'change_by', type: 'bigint', nullable: true })
  changeBy: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
