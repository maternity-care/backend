import { DeepPartial } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Order } from '../entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { SearchPaymentOrderDto } from '../dto/requests/search-payment-order.dto';
import { PaymentOrderResponseDto } from '../dto/responses/payment-order-response.dto';
import { OrderItem } from '../entities/order-item.entity';
import { SearchOrderDto } from '../dto/requests/search-order.dto';
import { CustomerRevenueResult, FacilityRevenueResult } from './order.interface';
import { CommonSearchDto } from '../dto/requests/common-search.dto';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface IPaymentRepository {
  // Orders
  createOrder(data: DeepPartial<Order>): Order;
  saveOrder(order: Order): Promise<Order>;
  findOrderById(id: string): Promise<Order | null>;
  updateOrder(id: string, data: DeepPartial<Order>): Promise<Order>;
  deleteOrder(id: string): Promise<Order>;
  searchOrders(query: SearchOrderDto): Promise<{
    count: number;
    data: Order[] | CustomerRevenueResult[] | FacilityRevenueResult[];
  }>;
  getOrderDetail(id: string, customerId: string): Promise<Order | null>;
  findOrderByIdForManagement(id: string, facilityId?: string): Promise<Order | null>;

  // Order Items
  createOrderItem(data: DeepPartial<OrderItem>): OrderItem;
  saveOrderItem(orderItem: OrderItem): Promise<OrderItem>;
  updateOrderItem(id: string, data: DeepPartial<OrderItem>): Promise<OrderItem>;
  deleteOrderItem(id: string): Promise<OrderItem>;

  // Invoices
  createInvoice(data: DeepPartial<Invoice>): Invoice;
  saveInvoice(invoice: Invoice): Promise<Invoice>;
  updateInvoice(id: string, data: DeepPartial<Invoice>): Promise<Invoice>;
  findInvoiceById(id: string, customerId: string): Promise<Invoice | null>;
  findInvoicesByOrderId(orderId: string): Promise<Invoice[]>;
  getInvoicesForCustomer(id: string): Promise<Invoice[]>;
  findAllInvoices(query: CommonSearchDto): Promise<{ count: number; data: Invoice[] }>;

  // Payments
  createPayment(data: DeepPartial<Payment>): Payment;
  savePayment(payment: Payment): Promise<Payment>;
  updatePayment(id: string, data: DeepPartial<Payment>): Promise<Payment>;
  findPaymentById(id: string, customerId: string): Promise<Payment | null>;
  findPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  getPaymentsForCustomer(id: string): Promise<Payment[]>;
  findAllPayments(query: CommonSearchDto): Promise<{ count: number; data: Payment[] }>;

  // Admin / list
  getAllOrdersWithPaymentAndInvoices(
    filters?: SearchPaymentOrderDto,
  ): Promise<{ count: number; orders: PaymentOrderResponseDto[] }>;
}
