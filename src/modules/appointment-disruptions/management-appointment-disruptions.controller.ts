import { Body, Controller, ForbiddenException, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from '../../common/constants/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RescheduleAppointmentDto } from '../appointments/dto/requests/reschedule-appointment.dto';
import { AppointmentDisruptionsService } from './appointment-disruptions.service';
import { RequestRefundDto } from './dto/request-refund.dto';

@ApiTags('Management - Appointment Disruptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('management/appointment-disruptions')
export class ManagementAppointmentDisruptionsController {
  constructor(private readonly service: AppointmentDisruptionsService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query('facilityId') facilityId?: string) {
    this.assertManager(user);
    return { data: await this.service.findManagement(this.getFacilityScope(user, facilityId)) };
  }

  @Patch(':id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    this.assertManager(user);
    return { data: await this.service.rescheduleManagement(id, user.id, this.getFacilityScope(user), dto) };
  }

  @Patch(':id/refund-complete')
  async completeRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RequestRefundDto,
  ) {
    this.assertManager(user);
    return { data: await this.service.completeRefund(id, user.id, this.getFacilityScope(user), dto) };
  }

  private getFacilityScope(user: AuthenticatedUser, requestedFacilityId?: string): string | null {
    if (user.roles.some((role) => role.name === RoleEnum.SUPER_ADMIN)) return requestedFacilityId ?? null;
    return user.activeFacilityId ?? user.facilities[0]?.id ?? null;
  }

  private assertManager(user: AuthenticatedUser) {
    const allowed = user.roles.some((role) => [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN].includes(role.name as RoleEnum));
    if (!allowed) throw new ForbiddenException('Bạn không có quyền xử lý lịch hẹn bị ảnh hưởng');
  }
}
