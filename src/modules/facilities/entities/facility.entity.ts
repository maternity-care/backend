import { Appointment } from './../../../database/entities/appointment.entity';
import { FacilityService } from './../../facility-services/entities/facility-service.entity';
import { Staff } from './../../staffs/entities/staff.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityClosureDay } from './facility-closure-day.entity';
import { FacilityOperatingHour } from './facility-operating-hour.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('facilities')
@Index('uq_facilities_code', ['code'], { unique: true })
@Index('uq_facilities_email', ['email'], { unique: true })
@Index('uq_facilities_phone', ['phone'], { unique: true })
@Index('idx_facilities_status', ['status'])
@Index('idx_facilities_owner_id', ['ownerId'])
@Index('idx_facilities_location', ['province', 'ward'])
export class Facility {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Staff, nullable: true })
  @ManyToOne(() => Staff, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: Staff | null;

  @ApiProperty({ type: () => [FacilityOperatingHour] })
  @OneToMany(() => FacilityOperatingHour, (operatingHour) => operatingHour.facility)
  operatingHours?: FacilityOperatingHour[];

  @ApiProperty({ type: () => [FacilityClosureDay] })
  @OneToMany(() => FacilityClosureDay, (closureDay) => closureDay.facility)
  closureDays?: FacilityClosureDay[];

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'owner_id', type: 'bigint' })
  ownerId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({ type: String })
  @Column({ name: 'email', type: 'varchar', length: 191 })
  email: string;

  @OneToMany(() => FacilityService, (facilityService) => facilityService.facility)
  facilityServices: FacilityService[];

  @ApiProperty({ type: String })
  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string;

  @ApiProperty({ type: String })
  @Column({ name: 'province', type: 'varchar', length: 255 })
  province: string;

  @ApiProperty({ type: String })
  @Column({ name: 'ward', type: 'varchar', length: 255 })
  ward: string;

  @ApiProperty({ type: String })
  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 7 })
  latitude: string;

  @ApiProperty({ type: String })
  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 7 })
  longitude: string;

  @ApiProperty({ type: String })
  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string;

  @OneToMany(() => Appointment, (appointment) => appointment.facility)
  appointments: Appointment[];

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
  @Column({ name: 'delete_reason', type: 'text', nullable: true })
  deleteReason: string | null;
}
