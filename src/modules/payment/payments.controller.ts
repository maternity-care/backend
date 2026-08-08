import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto/requests/create-order.dto';
import { UserSearchOrderDto } from './dto/requests/user-search.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Tạo đơn hàng' })
  async createOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return {
      message: 'Tạo đơn hàng thanh cong.',
      data: await this.paymentService.createOrder(user, dto),
    };
  }

  @Patch('orders/cancel/:id')
  @ApiOperation({ summary: 'hủy đơn hàng' })
  async cancelOrder(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Hủy đơn hàng thành công.',
      success: await this.paymentService.cancelOrder(id, user),
    };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Lấy đơn hàng của tôi và filter theo điều kiện' })
  async findMyOrders(@Query() query: UserSearchOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy danh sách đơn hàng của bạn thành công.',
      data: await this.paymentService.searchOrdersForCurrentUser(query, user),
    };
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng của tôi. có kèm invoice và payment' })
  async findMyOrder(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy chi tiết đơn hàng thành công.',
      data: await this.paymentService.findOrderByIdForCustomer(id, user),
    };
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Lấy toàn bộ hóa đơn của tôi' })
  async findMyOrderInvoices(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy danh sách hóa đơn thành công.',
      data: await this.paymentService.getInvoicesByOrderIdForCustomer(user),
    };
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Lấy chi tiết hóa đơn của tôi' })
  async findMyInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy chi tiết hóa đơn thành công.',
      data: await this.paymentService.getInvoiceByIdForCustomer(id, user),
    };
  }

  @Get('payments')
  @ApiOperation({ summary: 'Lấy giao dịch thanh toán của tôi' })
  async findMyOrderPayments(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy danh sách giao dịch thành công.',
      data: await this.paymentService.getPaymentsByOrderIdForCustomer(user),
    };
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Lấy chi tiết giao dịch thanh toán' })
  async findMyPayment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy chi tiết giao dịch thanh toán.',
      data: await this.paymentService.getPaymentByIdForCustomer(id, user),
    };
  }
}
