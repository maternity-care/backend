import { MaternityPackage } from './../../maternity-packages/entities/maternity-package.entity';
import { FacilityService } from './../../facility-services/entities/facility-service.entity';
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

export enum OrderItemType {
  NORMAL_SERVICE = 'normalService',
  PACKAGE = 'package',
}

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
  item: FacilityService | MaternityPackage;

  @ApiProperty({ type: String })
  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @ApiProperty({ type: String, description: 'type: normalService, package' })
  @Column({
    name: 'item_type',
    type: 'enum',
    enum: OrderItemType,
    default: OrderItemType.NORMAL_SERVICE,
  })
  itemType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ type: Number })
  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity: number;

  @ApiProperty({ type: String })
  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

  @ApiProperty({ type: String })
  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPrice: number;

  @ApiProperty({ type: Object })
  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
