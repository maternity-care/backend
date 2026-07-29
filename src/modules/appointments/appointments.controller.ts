import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
}
