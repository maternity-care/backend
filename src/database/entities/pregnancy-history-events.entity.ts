import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('pregnancy_history_events')
export class PregnancyHistoryEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @Column({ name: 'event_date', type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'ref_table', type: 'varchar', length: 100, nullable: true })
  refTable: string;

  @Column({ name: 'ref_id', type: 'bigint', nullable: true })
  refId: string;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
