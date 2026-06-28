import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../../common/constants/status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @Column({ name: 'facility_id', type: 'bigint', nullable: true })
  facilityId: string;

  @Column({ name: 'order_type', type: 'varchar', length: 50 })
  orderType: string;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 15, scale: 2 })
  subtotalAmount: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: string;

  @Column({ type: 'varchar', length: 30 })
  status: OrderStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
