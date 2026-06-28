import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaternityPackageStatus } from '../../common/constants/status.enum';

@Entity('maternity_packages')
export class MaternityPackage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: string;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays: number;

  @Column({ name: 'priority_level', type: 'int', default: 0 })
  priorityLevel: number;

  @Column({ type: 'varchar', length: 30 })
  status: MaternityPackageStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
