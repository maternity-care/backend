import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { PaymentStatus } from 'src/common/constants/status.enum';

@Entity('payments')
export class Payment {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => Order })
  @ManyToOne(() => Order, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ type: String })
  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'payment_method', type: 'varchar', length: 255 })
  paymentMethod: string;

  @ApiProperty({ type: String })
  @Column({ name: 'provider', type: 'varchar', length: 255 })
  provider: string;

  @ApiProperty({ type: String })
  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255 })
  providerTransactionId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  @Column({ name: 'status', type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional({ type: Date, nullable: true, required: false })
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ type: Object })
  @Column({ name: 'raw_response', type: 'json' })
  rawResponse: Record<string, unknown>;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
