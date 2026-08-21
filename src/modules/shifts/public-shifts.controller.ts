import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { WeeklyDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { DoctorShiftResponseDto } from './dto/responses/doctor-shift-response.dto';
import { ShiftsService } from './shifts.service';

@ApiTags('Public - Shifts')
@Controller('public/shifts')
export class PublicShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get('availability/doctors/:doctorId')
  @ApiOperation({ summary: 'Get public available appointment slots of a doctor on a date' })
  async getDoctorAvailability(
    @Param('doctorId') doctorId: string,
    @Query() query: DoctorAvailabilityQueryDto,
  ) {
    return {
      message: RESPONSE_MESSAGES.SHIFTS.AVAILABILITY_SUCCESS,
      data: await this.service.getDoctorAvailability(doctorId, query),
    };
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get public weekly shift calendar' })
  @ApiResponse({ status: 200, type: [DoctorShiftResponseDto] })
  async getWeekly(@Query() query: WeeklyDoctorShiftDto) {
    if (!query.facilityId) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.FACILITY_ID_REQUIRED);
    }

    return {
      message: RESPONSE_MESSAGES.SHIFTS.WEEKLY_SUCCESS,
      data: await this.service.getPublicWeeklyDoctorSchedule(
        query.facilityId,
        query.weekStart,
        query.doctorId,
        query.specialty,
      ),
    };
  }
}
