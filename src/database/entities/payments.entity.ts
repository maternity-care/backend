import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string;

  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 190, nullable: true })
  providerTransactionId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

}
