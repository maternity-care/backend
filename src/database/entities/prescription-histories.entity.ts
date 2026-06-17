import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('prescription_histories')
export class PrescriptionHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'prescription_id', type: 'bigint' })
  prescriptionId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'json' })
  snapshot: Record<string, unknown>;

  @Column({ name: 'changed_by', type: 'bigint' })
  changedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
