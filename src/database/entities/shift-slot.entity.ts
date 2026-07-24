import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../common/constants/status.enum';
import { Facility } from '../../modules/facilities/entities/facility.entity';
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

@Entity('shift_slots')
@Index('idx_shift_slots_facility_id', ['facilityId'])
@Index('idx_shift_slots_status', ['status'])
@Index('uq_shift_slots_facility_code', ['facilityId', 'code'], { unique: true })
export class ShiftSlot {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String, example: '1' })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String, example: 'MORNING' })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: String })
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @ApiProperty({ type: String })
  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @ApiProperty({ type: Boolean })
  @Column({ name: 'is_overnight', type: 'tinyint', default: 0 })
  isOvernight: boolean;

  @ApiProperty({ enum: ActiveStatus })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
