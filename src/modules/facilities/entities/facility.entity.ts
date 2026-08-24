import { Appointment } from '../../appointments/entities/appointment.entity';
import { FacilityService } from './../../facility-services/entities/facility-service.entity';
import { Staff } from './../../staffs/entities/staff.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InactiveSource } from '../../../common/constants/status.enum';
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

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'owner_id', type: 'bigint', nullable: true })
  ownerId: string | null;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'province', type: 'varchar', length: 255, nullable: true })
  province: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'ward', type: 'varchar', length: 255, nullable: true })
  ward: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, default: 1, minimum: 1 })
  @Column({ name: 'floor_count', type: 'int', nullable: true, default: 1 })
  floorCount: number | null;

  @ApiProperty({ type: String })
  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 7 })
  latitude: string;

  @ApiProperty({ type: String })
  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 7 })
  longitude: string;

  @ApiProperty({ type: String })
  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'inactive_from', type: 'timestamp', nullable: true })
  inactiveFrom: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'inactive_until', type: 'timestamp', nullable: true })
  inactiveUntil: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'inactive_reason', type: 'text', nullable: true })
  inactiveReason: string | null;

  @ApiPropertyOptional({ enum: InactiveSource, nullable: true, required: false })
  @Column({ name: 'inactive_source', type: 'varchar', length: 50, nullable: true })
  inactiveSource: InactiveSource | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'inactive_by', type: 'bigint', nullable: true })
  inactiveBy: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'reactivated_at', type: 'timestamp', nullable: true })
  reactivatedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'reactivated_by', type: 'bigint', nullable: true })
  reactivatedBy: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.facilityId)
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
