import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Facility } from './facility.entity';

export enum FacilityDayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

@Entity('facility_operating_hours')
@Index('uq_facility_operating_hours_day', ['facilityId', 'dayOfWeek'], { unique: true })
@Index('idx_facility_operating_hours_facility_id', ['facilityId'])
export class FacilityOperatingHour {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, facility => facility.operatingHours, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ enum: FacilityDayOfWeek })
  @Column({ name: 'day_of_week', type: 'enum', enum: FacilityDayOfWeek })
  dayOfWeek: FacilityDayOfWeek;

  @ApiProperty({ type: String, nullable: true })
  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime: string | null;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_closed', type: 'boolean', default: false })
  isClosed: boolean;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
