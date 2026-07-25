import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../common/constants/status.enum';
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

@Entity('facility_closure_days')
@Index('uq_facility_closure_days_date', ['facilityId', 'closureDate'], { unique: true })
@Index('idx_facility_closure_days_facility_id', ['facilityId'])
@Index('idx_facility_closure_days_status', ['status'])
export class FacilityClosureDay {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, facility => facility.closureDays, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String, example: '2026-09-02' })
  @Column({ name: 'closure_date', type: 'date' })
  closureDate: string;

  @ApiPropertyOptional({ type: String })
  @Column({ name: 'reason', type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @ApiProperty({ enum: ActiveStatus })
  @Column({ name: 'status', type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
