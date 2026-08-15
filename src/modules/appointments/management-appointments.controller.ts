import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getActiveFacilityId } from '../../common/helpers/facility-scope.helper';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CancelAppointmentDto } from './dto/requests/cancel-appointment.dto';
import { CheckInAppointmentDto } from './dto/requests/check-in-appointment.dto';
import { RescheduleAppointmentDto } from './dto/requests/reschedule-appointment.dto';
import { SearchAppointmentsDto } from './dto/requests/search-appointment.dto';
import { PermissionEnum } from 'src/common/constants/permission.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SearchProfileQueryDto } from '../pregnancy-profile/dto/request/search-pregnancy-profiles.dto';

@ApiTags('Management - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('management/appointments')
export class ManagementAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List appointments for management' })
  async findManagement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchAppointmentsDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_LIST_SUCCESS,
      data: await this.appointmentsService.findManagement(query, user.id, scopedFacilityId),
    };
  }

  @Get('pregnancy-profile')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'Get pregnancy profile of doctor' })
  async getAllPregnancyProfileOfDoctor(
    @Query() query: SearchProfileQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const doctorId = user.id;
    return {
      message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_LIST_SUCCESS,
      data: await this.appointmentsService.getPregnancyProfilesOfDoctor(doctorId, query),
    };
  }

  @Get('pregnancy-profile/:id')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'Get appointment of doctor with pregnancy profile' })
  async getAllAppointmentOfDoctorAndPregnancyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const doctorId = user.id;
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_LIST_SUCCESS,
      data: await this.appointmentsService.getAppointmentOfDoctorAndPregnancyProfile(doctorId, id),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment detail for management' })
  async findManagementById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_SUCCESS,
      data: await this.appointmentsService.findManagementById(id, scopedFacilityId),
    };
  }

  @Patch(':id/check-in')
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CheckInAppointmentDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.CHECKED_IN,
      data: await this.appointmentsService.checkIn(id, dto, scopedFacilityId),
    };
  }

  @Patch(':id/reschedule')
  async reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.RESCHEDULED,
      data: await this.appointmentsService.reschedule(id, dto, scopedFacilityId),
    };
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.CANCELLED,
      data: await this.appointmentsService.cancel(id, dto, scopedFacilityId),
    };
  }

  @Patch(':id/no-show')
  async noShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.NO_SHOW,
      data: await this.appointmentsService.noShow(id, dto, scopedFacilityId),
    };
  }

  @Patch(':id/complete')
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.COMPLETED,
      data: await this.appointmentsService.complete(id, scopedFacilityId),
    };
  }
}
