import { OrderStatus } from './../../common/constants/status.enum';
import { Facility } from './../../modules/facilities/entities/facility.entity';
import { User } from './../../modules/users/entities/user.entity';
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

@Entity('orders')
export class Order {
  @ApiProperty({ type: String, example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ApiProperty({ type: () => Facility })
  @ManyToOne(() => Facility, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @ApiProperty({ type: String })
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: String })
  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'pregnancy_profile_id', type: 'bigint' })
  pregnancyProfileId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'facility_id', type: 'bigint' })
  facilityId: string;

  @ApiProperty({ type: String })
  @Column({ name: 'order_type', type: 'varchar', length: 255, nullable: true })
  orderType: string | null;

  @ApiProperty({ type: Number })
  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotalAmount: number;

  @ApiProperty({ type: Number })
  @Column({ name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number | null;

  @ApiProperty({ type: Number })
  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  @Column({ name: 'status', type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
