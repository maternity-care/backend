import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('product_orders')
export class ProductOrder {
  @PrimaryColumn({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'shipping_name', type: 'varchar', length: 150 })
  shippingName: string;

  @Column({ name: 'shipping_phone', type: 'varchar', length: 30 })
  shippingPhone: string;

  @Column({ name: 'shipping_address', type: 'varchar', length: 500 })
  shippingAddress: string;

  @Column({ name: 'shipping_status', type: 'varchar', length: 30 })
  shippingStatus: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string;

}
