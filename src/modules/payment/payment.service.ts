import { FacilityService } from './../facility-services/entities/facility-service.entity';
import { MaternityPackage } from './../maternity-packages/entities/maternity-package.entity';
import { PregnancyProfile } from './../pregnancy-profile/entities/pregnancy-profile.entity';
import { Facility } from './../facilities/entities/facility.entity';
import {
  ActiveStatus,
  InvoiceStatus,
  MaternityPackageStatus,
  OrderStatus,
  PaymentStatus,
} from './../../common/constants/status.enum';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  getActiveFacilityId,
  assertFacilityAccess,
  isSuperAdmin,
} from '../../common/helpers/facility-scope.helper';
import { PAYMENT_REPOSITORY, IPaymentRepository } from './interfaces/payment-repository.interface';
import { PAYMENT_CONSTANT } from './payment.constant';
import { CreateOrderDto, CreateOrderItemDto } from './dto/requests/create-order.dto';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserStatusEnum } from '../users/users.enum';
import { PregnancyProfileStatus } from 'src/common/constants/status.enum';
import { Order } from './entities/order.entity';
import { OrderItem, OrderItemType } from './entities/order-item.entity';
import { ConfigService } from '@nestjs/config';
import { ICreateOrderItem } from './interfaces/order.interface';
import { SepayPayload } from './interfaces/sepay-payload.inteface';
import { SepayCallbackDto } from './dto/responses/sepay-callback.dto';
import { Payment } from './entities/payment.entity';
import { Invoice } from './entities/invoice.entity';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { UserSearchOrderDto } from './dto/requests/user-search.dto';
import { SearchOrderDto } from './dto/requests/search-order.dto';
import { CommonSearchDto } from './dto/requests/common-search.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  private generateOrderCode() {
    const now = new Date();
    const formattedDate = now
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    const code = Math.floor(Math.random() * 1000000);
    return formattedDate + String(code).padStart(6, '0');
  }

  async createOrder(
    actor: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<{ qrCodeUrl: string; code: string }> {
    const userRepository = this.dataSource.getRepository(User);
    const profileRepository = this.dataSource.getRepository(PregnancyProfile);
    const facilityRepository = this.dataSource.getRepository(Facility);

    // 1. Kiểm tra user riêng
    const customer = await userRepository.findOne({
      where: {
        id: actor.id,
        status: UserStatusEnum.ACTIVE,
      },
    });

    if (!customer) {
      throw new BadRequestException(PAYMENT_CONSTANT.USER_NOT_ACTIVE);
    }

    // 2. Kiểm tra hồ sơ thai kỳ thuộc user
    // người dùng chỉ có 1 hồ sơ active tại 1 thời điểm
    const pregnancyProfile = await profileRepository.findOne({
      where: {
        patientId: customer.id,
        status: PregnancyProfileStatus.ACTIVE,
      },
    });

    if (!pregnancyProfile) {
      throw new BadRequestException(PAYMENT_CONSTANT.USER_NOT_IN_PREGNANCY);
    }

    // 3. Kiểm tra cơ sở
    const facility = await facilityRepository.findOne({
      where: {
        id: dto.facilityId,
        status: ActiveStatus.ACTIVE,
      },
    });

    if (!facility) {
      throw new BadRequestException('Cơ sở không tồn tại hoặc đã ngừng hoạt động.');
    }

    if (!dto.orderItems?.length) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một sản phẩm hoặc dịch vụ.');
    }

    // 4. Lấy và tính giá thật từ database
    const resolvedItems = await this.resolveOrderItems(dto.orderItems, dto.facilityId);

    const subtotalAmount = resolvedItems.reduce(
      (sum: number, item: ICreateOrderItem) => sum + item.unitPrice * item.quantity,
      0,
    );

    // Discount phải được tính từ voucher/package/quy tắc phía server
    const discountAmount = 0;
    const totalAmount = Math.max(subtotalAmount - discountAmount, 0);

    // 5. Lưu toàn bộ bằng transaction
    const result = await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      const order = orderRepository.create({
        code: this.generateOrderCode(),
        customerId: customer.id,
        pregnancyProfileId: pregnancyProfile.id,
        facilityId: facility.id,
        orderType: dto.orderType,
        subtotalAmount,
        discountAmount,
        totalAmount,
        status: OrderStatus.PENDING_PAYMENT,
      });

      const savedOrder = await orderRepository.save(order);

      const orderItems = resolvedItems.map((item: ICreateOrderItem) =>
        orderItemRepository.create({
          orderId: savedOrder.id,
          itemId: item.itemId,
          itemType: item.itemType,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          metadata: item.metadata ?? null,
        }),
      );

      savedOrder.orderItems = await orderItemRepository.save(orderItems);
      const qrCodeUrl = await this.createPaymentQrCode(savedOrder);
      // Trả về QR code để quét

      return { qrCodeUrl, code: savedOrder.code };
    });

    return result;
  }

  private async resolveOrderItems(
    items: CreateOrderItemDto[],
    facilityId: string,
  ): Promise<ICreateOrderItem[]> {
    const maternityPackageRepository = this.dataSource.getRepository(MaternityPackage);
    const facilityServiceRepository = this.dataSource.getRepository(FacilityService);
    return Promise.all(
      items.map(async (item) => {
        switch (item.itemType) {
          case OrderItemType.PACKAGE: {
            const packageItem = await maternityPackageRepository.findOne({
              where: {
                id: item.itemId,
                status: MaternityPackageStatus.ACTIVE,
              },
            });

            if (!packageItem) {
              throw new BadRequestException(`Gói thai sản ${item.itemId} không tồn tại.`);
            }

            const returnData: ICreateOrderItem = {
              itemId: packageItem.id,
              itemType: item.itemType,
              name: packageItem.name,
              quantity: item.quantity,
              unitPrice: Number(packageItem.price),
              metadata: undefined,
            };

            return returnData;
          }

          case OrderItemType.NORMAL_SERVICE: {
            const service = await facilityServiceRepository.findOne({
              where: {
                id: item.itemId,
                facilityId,
                status: ActiveStatus.ACTIVE,
              },
              relations: {
                service: true,
              },
            });

            if (!service) {
              throw new BadRequestException(`Dịch vụ ${item.itemId} không tồn tại tại cơ sở.`);
            }

            return {
              itemId: service.id,
              itemType: item.itemType,
              name: service.service.name,
              quantity: item.quantity,
              unitPrice: Number(service.price),
              metadata: undefined,
            };
          }

          default:
            throw new BadRequestException(`Loại item ${item.itemType} không hợp lệ.`);
        }
      }),
    );
  }

  async createPaymentQrCode(order: Order): Promise<string> {
    const baseQrUrl = this.configService.getOrThrow<string>('sepay.baseQrUrl');
    const qrUrl = new URL(baseQrUrl);

    qrUrl.searchParams.set('amount', order.totalAmount.toString());
    qrUrl.searchParams.set('des', order.code);

    return qrUrl.toString();
  }

  // Todo: SEPay callback báo thanh toán thành công
  async handlePaymentSuccess(payload: SepayPayload): Promise<SepayCallbackDto> {
    // TODO: hàm trả lời callback
    if (payload.transferType !== 'in') {
      return {
        success: true,
        message: 'Transaction is not incoming',
      };
    }

    if (!payload.content.split('.')[3] || !payload.description.split('.')[3]) {
      return {
        success: true,
        message: 'Payment description not found',
      };
    }

    try {
      return await this.dataSource.transaction('SERIALIZABLE', async (manager) =>
        this.processTransaction(manager, payload),
      );
    } catch (error) {
      console.log(
        `Cannot process SePay transaction ${payload.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Cannot process SePay webhook');
    }
  }

  private async processTransaction(
    manager: EntityManager,
    payload: SepayPayload,
  ): Promise<SepayCallbackDto> {
    const providerTransactionId = String(payload.id);

    /*
     * Chống xử lý webhook trùng.
     * SePay có thể gửi lại khi không nhận được HTTP 200.
     */
    const existingPayment = await manager.findOne(Payment, {
      where: { providerTransactionId },
      relations: {
        order: true,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (existingPayment) {
      const invoice = await manager.findOne(Invoice, {
        where: {
          orderId: existingPayment.orderId,
        },
      });

      return {
        success: true,
        message: invoice ? 'Transaction already processed' : 'Payment already exists',
      };
    }

    /*
     * Khóa order để hai webhook không thể cùng cập nhật
     * order tại một thời điểm.
     */
    const order = await manager.findOne(Order, {
      where: {
        code: payload.content.split('.')[3],
      },
      relations: {
        customer: true,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!order) {
      console.log(`Order not found for payment code ${payload.content.split('.')[3]}`);

      return {
        success: true,
        message: 'Order not found',
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      return {
        success: true,
        message: 'Order was cancelled',
      };
    }

    const expectedAmount = this.toVndInteger(order.totalAmount);
    const receivedAmount = this.toVndInteger(payload.transferAmount ?? 0);

    if (receivedAmount !== expectedAmount) {
      console.log(
        [
          `Amount mismatch for order ${order.id}.`,
          `Expected: ${expectedAmount}.`,
          `Received: ${receivedAmount}.`,
        ].join(' '),
      );

      return {
        success: true,
        message: 'Payment amount does not match',
      };
    }

    if (order.status === OrderStatus.PAID) {
      return {
        success: true,
        message: 'Payment already processed',
      };
    }

    await this.realtimeEvents.serverEmit({
      room: `order:payment:${order?.code}`,
      event: 'order:result',
      data: {
        orderId: order.id,
        code: order.code,
        amount: receivedAmount,
        status: 'paid',
        transactionDate: payload.transactionDate,
      },
    });

    const transactionDate = this.parseSepayDate(payload.transactionDate);

    const payment = manager.create(Payment, {
      orderId: order.id,
      paymentMethod: 'bank',
      provider: 'SEPAY',
      providerTransactionId,
      amount: Number(receivedAmount),
      status: PaymentStatus.SUCCESS,
      paidAt: transactionDate,
      rawResponse: payload,
    });

    await manager.save(Payment, payment);

    order.status = OrderStatus.PAID;
    order.updatedAt = transactionDate;

    await manager.save(Order, order);

    let invoice = await manager.findOne(Invoice, {
      where: {
        orderId: order.id,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!invoice) {
      invoice = manager.create(Invoice, {
        /*
         * Dùng code theo order giúp kết quả xác định,
         * không sinh hai invoice khác nhau khi retry.
         */
        invoiceNo: `INV-${order.code}`,
        orderId: order.id,
        buyerName: order?.customer?.name,
        status: InvoiceStatus.PAID,
        issuedAt: transactionDate,
      });

      invoice = await manager.save(Invoice, invoice);
    }

    return {
      success: true,
      message: 'Success',
    };
  }

  private toVndInteger(value: string | number): number {
    const amount = Number(value);

    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error(`Invalid VND amount: ${value}`);
    }

    return amount;
  }

  /**
   * SePay trả thời gian dạng "YYYY-MM-DD HH:mm:ss" theo UTC+7.
   */
  private parseSepayDate(value: string): Date {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);

    if (!match) {
      throw new Error(`Invalid SePay transaction date: ${value}`);
    }

    const [, year, month, day, hour, minute, second] = match;

    const result = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`);

    if (Number.isNaN(result.getTime())) {
      throw new Error(`Invalid SePay transaction date: ${value}`);
    }

    return result;
  }

  // Bên trên là luồng normal của payment
  // dưới là phần alternative của payment

  async cancelOrder(orderId: string, user: AuthenticatedUser): Promise<boolean> {
    const order = await this.repository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException(PAYMENT_CONSTANT.ORDER_NOT_FOUND);
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException(PAYMENT_CONSTANT.ORDER_ALREADY_PAID);
    }

    if (user.id !== order.customerId) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    const result = await this.repository.updateOrder(orderId, { status: OrderStatus.CANCELLED });
    return !!result;
  }

  async searchOrdersForCurrentUser(query: UserSearchOrderDto, user: AuthenticatedUser) {
    const customerId = user.id;
    return this.repository.searchOrders({ ...query, customerId });
  }

  async findOrderByIdForCustomer(id: string, user: AuthenticatedUser) {
    const userId = user.id;
    return this.repository.getOrderDetail(id, userId);
  }

  async getInvoicesByOrderIdForCustomer(user: AuthenticatedUser) {
    const userId = user.id;
    return this.repository.getInvoicesForCustomer(userId);
  }

  async getInvoiceByIdForCustomer(id: string, user: AuthenticatedUser) {
    const invoice = await this.repository.findInvoiceById(id, user.id);
    if (!invoice) {
      throw new NotFoundException(PAYMENT_CONSTANT.INVOICE_NOT_FOUND);
    }

    return invoice;
  }

  async getPaymentsByOrderIdForCustomer(user: AuthenticatedUser) {
    const userId = user.id;

    return this.repository.getPaymentsForCustomer(userId);
  }

  async getPaymentByIdForCustomer(id: string, user: AuthenticatedUser) {
    const userId = user.id;

    return this.repository.findPaymentById(id, userId);
  }

  // ================== Management ==================

  async searchOrdersForManagement(query: SearchOrderDto, user: AuthenticatedUser) {
    const filters = { ...query };

    if (!isSuperAdmin(user)) {
      if (filters.facilityId) {
        assertFacilityAccess(user, filters.facilityId);
      } else {
        const activeFacilityId = getActiveFacilityId(user);
        if (activeFacilityId) {
          filters.facilityId = activeFacilityId;
        }
      }
    }
    return this.repository.searchOrders(filters);
  }

  async findOrderByIdForManagement(id: string, user: AuthenticatedUser): Promise<Order | null> {
    if (!isSuperAdmin(user)) {
      const facilityId = getActiveFacilityId(user);
      if (!facilityId) {
        throw new NotFoundException(PAYMENT_CONSTANT.FACILITY_NOT_FOUND);
      }
      const order = await this.repository.findOrderByIdForManagement(id, facilityId);
      if (!order) {
        throw new NotFoundException(PAYMENT_CONSTANT.ORDER_NOT_FOUND);
      }
      return order;
    } else {
      const order = await this.repository.findOrderByIdForManagement(id);
      if (!order) {
        throw new NotFoundException(PAYMENT_CONSTANT.ORDER_NOT_FOUND);
      }
      return order;
    }
  }

  async getInvoicesByOrderIdForManagement(query: CommonSearchDto, user: AuthenticatedUser) {
    const facilityId = getActiveFacilityId(user);
    if (!isSuperAdmin(user) && !facilityId) {
      throw new NotFoundException(PAYMENT_CONSTANT.FACILITY_NOT_FOUND);
    }

    if (!isSuperAdmin(user) && facilityId) {
      query.facilityId = facilityId;
    }

    return this.repository.findAllInvoices(query);
  }

  async getPaymentsByOrderIdForManagement(query: CommonSearchDto, user: AuthenticatedUser) {
    const facilityId = getActiveFacilityId(user);
    if (!isSuperAdmin(user) && !facilityId) {
      throw new NotFoundException(PAYMENT_CONSTANT.FACILITY_NOT_FOUND);
    }

    if (!isSuperAdmin(user) && facilityId) {
      query.facilityId = facilityId;
    }

    return this.repository.findAllPayments(query);
  }
}
