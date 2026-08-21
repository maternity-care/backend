import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/requests/create-appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Book an available appointment slot' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    const data = await this.appointmentsService.createForPatient(user.id, dto);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.CREATED,
      data,
    };
  }

  @Get(':id/service-results')
  @ApiOperation({ summary: 'Xem các chỉ định và kết quả theo từng chỉ định của lịch hẹn' })
  async getServiceResults(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_SUCCESS,
      data: await this.appointmentsService.findPatientServiceResults(id, user.id),
    };
  }

  @Get(':id/service-items/:itemId/queue')
  @ApiOperation({ summary: 'Xem vị trí hàng chờ và thời gian chờ ước tính của một chỉ định' })
  async getServiceQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_SUCCESS,
      data: await this.appointmentsService.getPatientServiceQueue(id, itemId, user.id),
    };
  }
}
