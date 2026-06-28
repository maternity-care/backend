import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceStatus } from '../../common/constants/status.enum';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'order_id', type: 'bigint', unique: true })
  orderId: string;

  @Column({ name: 'invoice_no', type: 'varchar', length: 100, unique: true })
  invoiceNo: string;

  @Column({ name: 'issued_at', type: 'timestamp' })
  issuedAt: Date;

  @Column({ name: 'buyer_name', type: 'varchar', length: 200 })
  buyerName: string;

  @Column({ name: 'buyer_tax_code', type: 'varchar', length: 50, nullable: true })
  buyerTaxCode: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string;

  @Column({ type: 'varchar', length: 30 })
  status: InvoiceStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}
