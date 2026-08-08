import { OrderItemType } from '../entities/order-item.entity';
import { OrderType } from '../entities/order.entity';

export class ICreateOrder {
  facilityId: string;

  orderType: OrderType;

  orderItems: ICreateOrderItem[];

  subtotalAmount: number;

  discountAmount: number;

  totalAmount: number;
}

export class ICreateOrderItem {
  itemId: string;

  itemType: OrderItemType;

  name: string;

  quantity: number;

  unitPrice: number;

  metadata?: Record<string, unknown> | null;
}

export interface CustomerRevenueResult {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  totalOrders: string;
  totalOrderAmount: string;
}

export interface FacilityRevenueResult {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  totalOrders: string;
  totalOrderAmount: string;
}
