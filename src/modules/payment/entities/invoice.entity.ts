import { InvoiceStatus } from '../../../common/constants/status.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('invoices')
export class Invoice {
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
  @Column({ name: 'invoice_no', type: 'varchar', length: 255 })
  invoiceNo: string;

  @ApiProperty({ type: Date })
  @Column({ name: 'issued_at', type: 'timestamp', nullable: true })
  issuedAt: Date | null;

  @ApiProperty({ type: String })
  @Column({ name: 'buyer_name', type: 'varchar', length: 255 })
  buyerName: string;

  @ApiProperty({ type: String })
  @Column({ name: 'buyer_tax_code', type: 'varchar', length: 255, nullable: true })
  buyerTaxCode: string | null;

  @ApiProperty({ type: String })
  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @ApiProperty({ enum: InvoiceStatus, enumName: 'InvoiceStatus' })
  @Column({ name: 'status', type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
