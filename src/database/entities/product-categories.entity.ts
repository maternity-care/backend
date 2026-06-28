import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActiveStatus } from '../../common/constants/status.enum';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 190, unique: true })
  slug: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string;

  @Column({ type: 'varchar', length: 30 })
  status: ActiveStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
