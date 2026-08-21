import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { RoleEnum } from '../../common/constants/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getActiveFacilityId } from '../../common/helpers/facility-scope.helper';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import {
  AddAppointmentServiceItemsDto,
  CheckInAppointmentServiceItemDto,
  SetServiceResultExpectedAtDto,
} from './dto/requests/appointment-service-item.dto';
import { CancelAppointmentDto } from './dto/requests/cancel-appointment.dto';
import { CheckInAppointmentDto } from './dto/requests/check-in-appointment.dto';
import { RescheduleAppointmentDto } from './dto/requests/reschedule-appointment.dto';
import { SearchAppointmentsDto } from './dto/requests/search-appointment.dto';
import { PermissionEnum } from 'src/common/constants/permission.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SearchProfileQueryDto } from '../pregnancy-profile/dto/request/search-pregnancy-profiles.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Management - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('management/appointments')
export class ManagementAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  private isDoctor(user: AuthenticatedUser) {
    return user.roles.some((role) => role.name === RoleEnum.DOCTOR);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments for management' })
  async findManagement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchAppointmentsDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_LIST_SUCCESS,
      data: await this.appointmentsService.findManagement(
        query,
        user.id,
        scopedFacilityId,
        this.isDoctor(user),
      ),
    };
  }

  @Get('pregnancy-profile')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'Get pregnancy profile of doctor' })
  async getAllPregnancyProfileOfDoctor(
    @Query() query: SearchProfileQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    const doctorId = this.isDoctor(user) ? user.id : null;
    return {
      message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_LIST_SUCCESS,
      data: await this.appointmentsService.getPregnancyProfilesOfDoctor(
        doctorId,
        query,
        scopedFacilityId,
      ),
    };
  }

  @Get('pregnancy-profile/:id')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'Get appointment of doctor with pregnancy profile' })
  async getAllAppointmentOfDoctorAndPregnancyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    const doctorId = this.isDoctor(user) ? user.id : null;
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_LIST_SUCCESS,
      data: await this.appointmentsService.getAppointmentOfDoctorAndPregnancyProfile(
        doctorId,
        id,
        scopedFacilityId,
      ),
    };
  }

  @Get('service-items/mine')
  @Roles(RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'List service indications visible to current specialist doctor' })
  async findMySpecialistServiceItems(@CurrentUser() user: AuthenticatedUser) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_LIST_SUCCESS,
      data: await this.appointmentsService.findSpecialistServiceItems(user.id, scopedFacilityId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment detail for management' })
  async findManagementById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_SUCCESS,
      data: await this.appointmentsService.findManagementById(
        id,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Get(':id/service-items')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'List service indications of an appointment' })
  async findServiceItems(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.GET_LIST_SUCCESS,
      data: await this.appointmentsService.findServiceItems(
        id,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Post(':id/service-items')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'Add service indications to an appointment' })
  async addServiceItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddAppointmentServiceItemsDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.UPDATED,
      data: await this.appointmentsService.addServiceItems(
        id,
        dto,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Patch(':id/service-items/:itemId/check-in')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF, RoleEnum.NURSE, RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'Specialist doctor checks in a service indication' })
  async checkInServiceItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: CheckInAppointmentServiceItemDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.CHECKED_IN,
      data: await this.appointmentsService.checkInServiceItem(
        id,
        itemId,
        dto,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Patch(':id/service-items/:itemId/call')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF, RoleEnum.NURSE, RoleEnum.DOCTOR)
  async callServiceItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.UPDATED,
      data: await this.appointmentsService.callServiceItem(
        id,
        itemId,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Patch(':id/service-items/:itemId/start')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF, RoleEnum.NURSE, RoleEnum.DOCTOR)
  async startServiceItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.UPDATED,
      data: await this.appointmentsService.startServiceItem(
        id,
        itemId,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Patch(':id/service-items/:itemId/expect-result')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF, RoleEnum.NURSE, RoleEnum.DOCTOR)
  async setServiceResultExpectedAt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: SetServiceResultExpectedAtDto,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.UPDATED,
      data: await this.appointmentsService.setServiceResultExpectedAt(
        id,
        itemId,
        dto,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Patch(':id/service-items/:itemId/complete')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF, RoleEnum.NURSE, RoleEnum.DOCTOR)
  async completeServiceItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const scopedFacilityId = getActiveFacilityId(user);
    return {
      message: RESPONSE_MESSAGES.APPOINTMENTS.UPDATED,
      data: await this.appointmentsService.completeServiceItem(
        id,
        itemId,
        scopedFacilityId,
        user.id,
        this.isDoctor(user),
      ),
    };
  }

  @Patch(':id/check-in')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF)
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
