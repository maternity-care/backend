import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Shift } from './shift.entity';
import { ShiftDisruptionStatus } from 'src/common/constants/status.enum';

@Entity('shift_disruptions')
export class ShiftDisruption {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Shift })
  @ManyToOne(() => Shift, { onDelete: 'RESTRICT', nullable: false })
  shift: Shift;

  @ApiProperty({ type: String })
  @Column({ name: 'type', type: 'varchar', length: 50 })
  type: string;

  @ApiProperty({ type: String })
  @Column({ name: 'source_type', type: 'varchar', length: 255 })
  sourceType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'source_id', type: 'bigint' })
  sourceId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'doctor_shift_id', type: 'bigint', nullable: true })
  doctorShiftId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'room_id', type: 'bigint', nullable: true })
  roomId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @ApiProperty({ enum: ShiftDisruptionStatus, enumName: 'ShiftDisruptionStatus' })
  @Column({ name: 'status', type: 'enum', enum: ShiftDisruptionStatus })
  status: ShiftDisruptionStatus;

  @ApiPropertyOptional({ type: String, nullable: true, required: false })
  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
