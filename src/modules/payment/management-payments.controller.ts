import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaymentService } from './payment.service';
import { SearchOrderDto } from './dto/requests/search-order.dto';
import { CommonSearchDto } from './dto/requests/common-search.dto';

@ApiTags('Management - Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF)
@Controller('management/payments')
export class ManagementPaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('orders')
  @Permissions(PermissionEnum.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng thanh toán' })
  async findOrders(@Query() query: SearchOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy danh sách đơn hàng thành công.',
      data: await this.paymentService.searchOrdersForManagement(query, user),
    };
  }

  @Get('orders/:id')
  @Permissions(PermissionEnum.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng thanh toán' })
  async findOrder(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy chi tiết đơn hàng thành công.',
      data: await this.paymentService.findOrderByIdForManagement(id, user),
    };
  }

  @Get('invoices')
  @Permissions(PermissionEnum.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn' })
  async findOrderInvoices(@Query() query: CommonSearchDto, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy danh sách hóa đơn thành công.',
      data: await this.paymentService.getInvoicesByOrderIdForManagement(query, user),
    };
  }

  @Get('payments')
  @Permissions(PermissionEnum.PAYMENT_VIEW)
  @ApiOperation({ summary: 'Lấy danh sách giao dịch thanh toán cho đơn hàng' })
  async findOrderPayments(@Query() query: CommonSearchDto, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Lấy danh sách giao dịch thanh toán thành công.',
      data: await this.paymentService.getPaymentsByOrderIdForManagement(query, user),
    };
  }
}
