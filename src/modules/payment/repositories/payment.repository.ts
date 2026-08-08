import { OrderStatus } from './../../../common/constants/status.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  And,
  DeepPartial,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import { SearchPaymentOrderDto } from '../dto/requests/search-payment-order.dto';
import { PaymentOrderResponseDto } from '../dto/responses/payment-order-response.dto';
import { IPaymentRepository } from '../interfaces/payment-repository.interface';
import { SearchOrderDto } from '../dto/requests/search-order.dto';
import { CustomerRevenueResult, FacilityRevenueResult } from '../interfaces/order.interface';
import { CommonSearchDto } from '../dto/requests/common-search.dto';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  // Orders
  createOrder(data: DeepPartial<Order>): Order {
    return this.orderRepository.create(data);
  }

  saveOrder(order: Order): Promise<Order> {
    return this.orderRepository.save(order);
  }

  async findOrderById(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({ where: { id } });
  }

  async updateOrder(id: string, data: DeepPartial<Order>): Promise<Order> {
    const order = await this.findOrderById(id);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    Object.assign(order, data);
    return this.orderRepository.save(order);
  }

  async deleteOrder(id: string): Promise<Order> {
    const order = await this.findOrderById(id);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    return this.orderRepository.remove(order);
  }

  async searchOrders(query: SearchOrderDto): Promise<{
    count: number;
    data: Order[] | CustomerRevenueResult[] | FacilityRevenueResult[];
  }> {
    // customer, admin, super admin mới vô đc
    if (query.sortCustomer) {
      return this.searchCustomerRevenue(query);
    }

    // super admin sort facility
    if (query.sortFacility) {
      return this.searchFacilityRevenue(query);
    }

    return this.searchNormalOrders(query);
  }

  private async searchCustomerRevenue(query: SearchOrderDto): Promise<{
    count: number;
    data: CustomerRevenueResult[];
  }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.customer', 'customer')
      .select('customer.id', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('customer.email', 'customerEmail')
      .addSelect('customer.phone', 'customerPhone')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalOrderAmount')
      .where('order.status = :status', {
        status: OrderStatus.PAID,
      });

    this.applyCommonFilters(qb, query);

    qb.groupBy('customer.id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.email')
      .addGroupBy('customer.phone')
      .orderBy('totalOrderAmount', query.sortCustomer === 'ASC' ? 'ASC' : 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const customers = await qb.getRawMany<CustomerRevenueResult>();

    const countQb = this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerId)', 'count')
      .where('order.status = :status', {
        status: OrderStatus.PAID,
      });

    this.applyCommonFilters(countQb, query);

    const countResult = await countQb.getRawOne<{
      count: string;
    }>();

    return {
      count: Number(countResult?.count ?? 0),
      data: customers,
    };
  }

  private async searchFacilityRevenue(query: SearchOrderDto): Promise<{
    count: number;
    data: FacilityRevenueResult[];
  }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.facility', 'facility')
      .select('facility.id', 'facilityId')
      .addSelect('facility.name', 'facilityName')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalOrderAmount')
      .where('order.status = :status', {
        status: OrderStatus.PAID,
      });

    this.applyCommonFilters(qb, query);

    qb.groupBy('facility.id')
      .addGroupBy('facility.name')
      .addGroupBy('facility.code')
      .orderBy('totalOrderAmount', query.sortFacility === 'ASC' ? 'ASC' : 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const facilities = await qb.getRawMany<FacilityRevenueResult>();

    const countQb = this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.facilityId)', 'count')
      .where('order.status = :status', {
        status: OrderStatus.PAID,
      });

    this.applyCommonFilters(countQb, query);

    const countResult = await countQb.getRawOne<{
      count: string;
    }>();

    return {
      count: Number(countResult?.count ?? 0),
      data: facilities,
    };
  }

  private async searchNormalOrders(query: SearchOrderDto): Promise<{
    count: number;
    data: Order[];
  }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.facility', 'facility');

    if (query.customerId) {
      qb.andWhere('order.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.facilityId) {
      qb.andWhere('order.facilityId = :facilityId', {
        facilityId: query.facilityId,
      });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', {
        status: query.status,
      });
    }

    if (query.code) {
      qb.andWhere('order.code = :code', {
        code: query.code,
      });
    }

    if (query.pregnancyProfileId) {
      qb.andWhere('order.pregnancyProfileId = :pregnancyProfileId', {
        pregnancyProfileId: query.pregnancyProfileId,
      });
    }

    if (query.orderType) {
      qb.andWhere('order.orderType = :orderType', {
        orderType: query.orderType,
      });
    }

    if (query.paymentMethod) {
      qb.andWhere(
        `EXISTS (
        SELECT 1
        FROM payments payment
        WHERE payment.order_id = order.id
          AND payment.payment_method = :paymentMethod
      )`,
        {
          paymentMethod: query.paymentMethod,
        },
      );
    }

    this.applyDateFilters(qb, query);

    if (query.sortTotalAmount) {
      qb.orderBy('order.totalAmount', query.sortTotalAmount === 'ASC' ? 'ASC' : 'DESC').addOrderBy(
        'order.createdAt',
        'DESC',
      );
    } else {
      qb.orderBy('order.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [orders, count] = await qb.getManyAndCount();

    return { count, data: orders };
  }

  private applyDateFilters(qb: SelectQueryBuilder<Order>, query: SearchOrderDto): void {
    if (query.fromDate) {
      qb.andWhere('order.createdAt >= :fromDate', {
        fromDate: new Date(query.fromDate),
      });
    }

    if (query.toDate) {
      const toDate = new Date(query.toDate);
      toDate.setHours(23, 59, 59, 999);

      qb.andWhere('order.createdAt <= :toDate', {
        toDate,
      });
    }
  }

  private applyCommonFilters(qb: SelectQueryBuilder<Order>, query: SearchOrderDto): void {
    if (query.customerId) {
      qb.andWhere('order.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.facilityId) {
      qb.andWhere('order.facilityId = :facilityId', {
        facilityId: query.facilityId,
      });
    }

    if (query.orderType) {
      qb.andWhere('order.orderType = :orderType', {
        orderType: query.orderType,
      });
    }

    if (query.paymentMethod) {
      qb.andWhere(
        `EXISTS (
        SELECT 1
        FROM payments payment
        WHERE payment.order_id = order.id
          AND payment.payment_method = :paymentMethod
      )`,
        {
          paymentMethod: query.paymentMethod,
        },
      );
    }

    this.applyDateFilters(qb, query);
  }

  async getOrderDetail(id: string, customerId: string): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id, customerId },
      relations: ['customer', 'facility', 'pregnancyProfile', 'orderItems', 'payments', 'invoice'],
    });

    return order;
  }

  async findOrderByIdForManagement(id: string, facilityId?: string): Promise<Order | null> {
    const order = await this.orderRepository.findOne({
      where: { id, facilityId },
      relations: ['customer', 'facility', 'pregnancyProfile', 'orderItems', 'payments', 'invoice'],
    });

    return order;
  }

  // Order Items
  createOrderItem(data: DeepPartial<OrderItem>): OrderItem {
    return this.orderItemRepository.create(data);
  }

  saveOrderItem(orderItem: OrderItem): Promise<OrderItem> {
    return this.orderItemRepository.save(orderItem);
  }

  async updateOrderItem(id: string, data: DeepPartial<OrderItem>): Promise<OrderItem> {
    const item = await this.orderItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy mục đơn hàng.');
    }

    Object.assign(item, data);
    return this.orderItemRepository.save(item);
  }

  async deleteOrderItem(id: string): Promise<OrderItem> {
    const item = await this.orderItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy mục đơn hàng.');
    }

    return this.orderItemRepository.remove(item);
  }

  // Invoices
  createInvoice(data: DeepPartial<Invoice>): Invoice {
    return this.invoiceRepository.create(data);
  }

  saveInvoice(invoice: Invoice): Promise<Invoice> {
    return this.invoiceRepository.save(invoice);
  }

  async updateInvoice(id: string, data: DeepPartial<Invoice>): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Không tìm thấy hóa đơn.');
    }

    Object.assign(invoice, data);
    return this.invoiceRepository.save(invoice);
  }

  async findInvoiceById(id: string, customerId: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id, order: { customerId } },
      relations: { order: { orderItems: true, facility: true, customer: true, payments: true } },
    });
  }

  findInvoicesByOrderId(orderId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({ where: { orderId } });
  }

  async getInvoicesForCustomer(id: string): Promise<Invoice[]> {
    const invoices = await this.invoiceRepository.find({
      where: { order: { customerId: id } },
      relations: { order: { orderItems: true } },
      order: { createdAt: 'DESC' },
    });
    if (!invoices) {
      return [];
    }

    return invoices;
  }

  async findAllInvoices(query: CommonSearchDto): Promise<{ count: number; data: Invoice[] }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const where: FindOptionsWhere<Invoice> = {};

    if (query.facilityId) {
      where.order = {
        facilityId: query.facilityId,
      };
    }

    if (query.fromDate && query.toDate) {
      const fromDate = new Date(query.fromDate);
      const toDate = new Date(query.toDate);

      toDate.setHours(23, 59, 59, 999);

      where.createdAt = And(MoreThanOrEqual(fromDate), LessThanOrEqual(toDate));
    } else if (query.fromDate) {
      where.createdAt = MoreThanOrEqual(new Date(query.fromDate));
    } else if (query.toDate) {
      const toDate = new Date(query.toDate);

      toDate.setHours(23, 59, 59, 999);

      where.createdAt = LessThanOrEqual(toDate);
    }

    const [data, count] = await this.invoiceRepository.findAndCount({
      where,
      relations: {
        order: {
          orderItems: true,
          facility: true,
          customer: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { count, data };
  }

  // Payments
  createPayment(data: DeepPartial<Payment>): Payment {
    return this.paymentRepository.create(data);
  }

  savePayment(payment: Payment): Promise<Payment> {
    return this.paymentRepository.save(payment);
  }

  async updatePayment(id: string, data: DeepPartial<Payment>): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán.');
    }

    Object.assign(payment, data);
    return this.paymentRepository.save(payment);
  }

  async findPaymentById(id: string, customerId?: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id, order: { customerId } },
      relations: { order: { orderItems: true, facility: true, customer: true, invoices: true } },
    });
  }

  async findPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { orderId } });
  }

  async getPaymentsForCustomer(id: string): Promise<Payment[]> {
    const payments = await this.paymentRepository.find({
      where: { order: { customerId: id } },
      relations: { order: { orderItems: true, facility: true, customer: true, invoices: true } },
      order: { createdAt: 'DESC' },
    });

    return payments ?? [];
  }

  async findAllPayments(query: CommonSearchDto): Promise<{ count: number; data: Payment[] }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const where: FindOptionsWhere<Payment> = {};

    if (query.facilityId) {
      where.order = {
        facilityId: query.facilityId,
      };
    }

    if (query.fromDate && query.toDate) {
      const fromDate = new Date(query.fromDate);
      const toDate = new Date(query.toDate);

      toDate.setHours(23, 59, 59, 999);

      where.createdAt = And(MoreThanOrEqual(fromDate), LessThanOrEqual(toDate));
    } else if (query.fromDate) {
      where.createdAt = MoreThanOrEqual(new Date(query.fromDate));
    } else if (query.toDate) {
      const toDate = new Date(query.toDate);

      toDate.setHours(23, 59, 59, 999);

      where.createdAt = LessThanOrEqual(toDate);
    }

    const [data, count] = await this.paymentRepository.findAndCount({
      where,
      relations: {
        order: {
          orderItems: true,
          facility: true,
          customer: true,
          invoices: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { count, data };
  }

  // Admin
  async getAllOrdersWithPaymentAndInvoices(
    filters?: SearchPaymentOrderDto,
  ): Promise<{ count: number; orders: PaymentOrderResponseDto[] }> {
    const query = this.buildListQuery(filters);
    const [orders, total] = await Promise.all([
      query.getRawMany<Record<string, unknown>>(),
      this.countDistinctOrders(query),
    ]);

    return {
      count: total,
      orders: orders.map((row) => this.mapRowToOrderResponse(row)),
    };
  }

  private buildListQuery(filters?: SearchPaymentOrderDto): SelectQueryBuilder<Order> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('users', 'customer', 'customer.id = order.customer_id')
      .leftJoin('facilities', 'facility', 'facility.id = order.facility_id')
      .leftJoin('order_items', 'orderItem', 'orderItem.order_id = order.id')
      .select('order.id', 'id')
      .addSelect('order.code', 'code')
      .addSelect('order.order_type', 'orderType')
      .addSelect('order.subtotal_amount', 'subtotalAmount')
      .addSelect('order.discount_amount', 'discountAmount')
      .addSelect('order.total_amount', 'totalAmount')
      .addSelect('order.status', 'status')
      .addSelect('order.created_at', 'createdAt')
      .addSelect('order.updated_at', 'updatedAt')
      .addSelect('customer.id', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('customer.email', 'customerEmail')
      .addSelect('customer.phone', 'customerPhone')
      .addSelect('facility.id', 'facilityId')
      .addSelect('facility.name', 'facilityName')
      .addSelect('facility.code', 'facilityCode')
      .distinct(true)
      .orderBy('order.created_at', filters?.sort === 'ASC' ? 'ASC' : 'DESC');

    if (filters?.facilityId) {
      query.andWhere('order.facility_id = :facilityId', { facilityId: filters.facilityId });
    }

    if (filters?.customerId) {
      query.andWhere('order.customer_id = :customerId', { customerId: filters.customerId });
    }

    if (filters?.itemId) {
      query.andWhere('orderItem.item_id = :itemId', { itemId: filters.itemId });
    }

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.fromDate) {
      query.andWhere('order.created_at >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('order.created_at <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.search) {
      query.andWhere(
        '(LOWER(order.code) LIKE LOWER(:search) OR LOWER(customer.name) LIKE LOWER(:search) OR LOWER(customer.email) LIKE LOWER(:search) OR LOWER(orderItem.name) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }

  private async countDistinctOrders(query: SelectQueryBuilder<Order>): Promise<number> {
    const countQuery = query.clone().select('COUNT(DISTINCT order.id)', 'count');
    const raw = await countQuery.getRawOne<{ count: string }>();
    return Number(raw?.count ?? 0);
  }

  private mapRowToOrderResponse(row: Record<string, unknown>): PaymentOrderResponseDto {
    return {
      id: String(row.id),
      code: String(row.code),
      orderType: row.orderType as string | null,
      subtotalAmount: Number(row.subtotalAmount),
      discountAmount: row.discountAmount === null ? null : Number(row.discountAmount),
      totalAmount: Number(row.totalAmount),
      status: String(row.status) as OrderStatus,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      customerId: String(row.customerId),
      facilityId: String(row.facilityId),
      customer: {
        id: String(row.customerId),
        name: String(row.customerName),
        email: String(row.customerEmail),
        phone: row.customerPhone as string | undefined,
      },
      facility: {
        id: String(row.facilityId),
        name: String(row.facilityName),
        code: String(row.facilityCode),
      },
    };
  }
}
