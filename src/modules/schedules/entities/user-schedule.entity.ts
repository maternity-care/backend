import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_schedules')
@Index('idx_user_schedules_user_date_time', ['userId', 'scheduleDate', 'scheduleTime'])
@Index('idx_user_schedules_appointment', ['appointmentId'])
export class UserSchedule {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: String })
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ type: String, example: 'checkup' })
  @Column({ name: 'schedule_type', type: 'varchar', length: 50 })
  type: string;

  @ApiProperty({ type: String, example: '2026-07-30' })
  @Column({ name: 'schedule_date', type: 'date' })
  scheduleDate: string;

  @ApiProperty({ type: String, example: '08:30:00' })
  @Column({ name: 'schedule_time', type: 'time' })
  scheduleTime: string;

  @ApiProperty({ type: String, example: 'upcoming' })
  @Column({ name: 'status', type: 'varchar', length: 50, default: 'upcoming' })
  status: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'doctor', type: 'varchar', length: 255, nullable: true })
  doctor: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ type: String, example: 'manual' })
  @Column({ name: 'source', type: 'varchar', length: 50, default: 'manual' })
  source: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'appointment_id', type: 'bigint', nullable: true })
  appointmentId: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
