import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DisruptionStatus } from '../../common/constants/status.enum';

@Entity('shift_disruptions')
export class ShiftDisruption {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ name: 'source_type', type: 'varchar', length: 50 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'bigint' })
  sourceId: string;

  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @Column({ name: 'doctor_shift_id', type: 'bigint', nullable: true })
  doctorShiftId: string | null;

  @Column({ name: 'room_id', type: 'bigint', nullable: true })
  roomId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 30 })
  status: DisruptionStatus;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
