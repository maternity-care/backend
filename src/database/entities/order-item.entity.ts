import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Order })
  @ManyToOne(() => Order, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ type: String })
  @Column({ name: 'item', type: 'varchar', length: 255 })
  item: string;

  @ApiProperty({ type: String })
  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'item_type', type: 'varchar', length: 255 })
  itemType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @ApiProperty({ type: String })
  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: string;

  @ApiProperty({ type: String })
  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2 })
  totalPrice: string;

  @ApiProperty({ type: Object })
  @Column({ name: 'metadata', type: 'json' })
  metadata: Record<string, unknown>;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
