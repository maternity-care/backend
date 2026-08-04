import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { ShiftsService } from './shifts.service';

@ApiTags('Public - Shifts')
@Controller('shifts')
export class PublicShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get('doctors/:doctorId/availability')
  @ApiOperation({ summary: 'Get public available appointment slots of a doctor on a date' })
  @ApiResponse({ status: 200, description: 'Available doctor shifts for booking' })
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query() query: DoctorAvailabilityQueryDto,
  ) {
    return {
      message: RESPONSE_MESSAGES.SHIFTS.AVAILABILITY_SUCCESS,
      data: await this.service.getDoctorAvailability(doctorId, query),
    };
  }
}
