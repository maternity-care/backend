import { Body, Controller, ForbiddenException, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RescheduleAppointmentDto } from '../appointments/dto/requests/reschedule-appointment.dto';
import { AppointmentDisruptionsService } from './appointment-disruptions.service';
import { RequestRefundDto } from './dto/request-refund.dto';

@ApiTags('Appointment Disruptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointment-disruptions')
export class AppointmentDisruptionsController {
  constructor(private readonly service: AppointmentDisruptionsService) {}

  @Get()
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    this.assertPatient(user);
    return { data: await this.service.findMine(user.id) };
  }

  @Get(':id/options')
  async findOptions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.assertPatient(user);
    return { data: await this.service.findOptions(id, user.id) };
  }

  @Patch(':id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    this.assertPatient(user);
    return { data: await this.service.rescheduleMine(id, user.id, dto) };
  }

  @Patch(':id/refund')
  async refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RequestRefundDto,
  ) {
    this.assertPatient(user);
    return { data: await this.service.requestRefund(id, user.id, dto) };
  }

  private assertPatient(user: AuthenticatedUser) {
    if (user.employeeCode || user.personalEmail || user.roles.length || user.facilities.length) {
      throw new ForbiddenException('API này chỉ dành cho tài khoản thai phụ');
    }
  }
}
