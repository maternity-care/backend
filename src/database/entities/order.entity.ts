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
import { OrderStatus } from 'src/common/constants/status.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { Facility } from 'src/modules/facilities/entities/facility.entity';

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
  @Column({ name: 'order_type', type: 'varchar', length: 255 })
  orderType: string;

  @ApiProperty({ type: String })
  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 15, scale: 2 })
  subtotalAmount: string;

  @ApiProperty({ type: String })
  @Column({ name: 'discount_amount', type: 'decimal', precision: 15, scale: 2 })
  discountAmount: string;

  @ApiProperty({ type: String })
  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  @Column({ name: 'status', type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ type: Date })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
