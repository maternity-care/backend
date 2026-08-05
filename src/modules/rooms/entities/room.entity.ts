import { RoomType } from './../../../database/entities/room-type.entity';
import { ActiveStatus } from './../../../common/constants/status.enum';
import { Facility } from './../../facilities/entities/facility.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rooms')
@Index('uq_rooms_facility_code', ['facilityId', 'code'], { unique: true })
@Index('uq_rooms_facility_name', ['facilityId', 'name'], { unique: true })
@Index('idx_rooms_facility_id', ['facilityId'])
@Index('idx_rooms_room_type_id', ['roomTypeId'])
@Index('idx_rooms_status', ['status'])
export class Room {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: () => RoomType })
  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'room_type_id', type: 'bigint' })
  roomTypeId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'floor', type: 'varchar', length: 255 })
  floor: string;

  @ApiProperty({ enum: ActiveStatus, enumName: 'RoomStatusEnum' })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'inactive_from', type: 'timestamp', nullable: true })
  inactiveFrom: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'inactive_until', type: 'timestamp', nullable: true })
  inactiveUntil: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'inactive_reason', type: 'text', nullable: true })
  inactiveReason: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'inactive_by', type: 'varchar', length: 255, nullable: true })
  inactiveBy: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'reactivated_at', type: 'timestamp', nullable: true })
  reactivatedAt: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'reactivated_by', type: 'varchar', length: 255, nullable: true })
  reactivatedBy: string | null;

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
  @Column({ name: 'deleted_by', type: 'varchar', length: 255, nullable: true })
  deletedBy: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'deleted_reason', type: 'text', nullable: true })
  deletedReason: string | null;
}
