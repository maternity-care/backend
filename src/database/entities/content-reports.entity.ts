import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('content_reports')
export class ContentReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'reporter_id', type: 'bigint' })
  reporterId: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50 })
  targetType: string;

  @Column({ name: 'target_id', type: 'bigint' })
  targetId: string;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'resolved_by', type: 'bigint', nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
