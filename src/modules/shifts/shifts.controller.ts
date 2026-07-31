import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { assertFacilityAccess, getActiveFacilityId } from '../../common/helpers/facility-scope.helper';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AutoGenerateShiftsDto } from './dto/requests/auto-generate-shifts.dto';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CopyWeekDoctorShiftDto } from './dto/requests/copy-week-doctor-shift.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { SearchDoctorShiftDto, WeeklyDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import { DoctorShiftPaginatedResponseDto, DoctorShiftResponseDto } from './dto/responses/doctor-shift-response.dto';
import {
  AutoGenerateConfirmApiResponse,
  AutoGeneratePreviewApiResponse,
} from './interfaces/auto-generate-shifts.interface';
import { ShiftsService } from './shifts.service';

@ApiTags('Management - Shifts')
// TEMP DEV: JwtAuthGuard dang duoc tam tat de test shifts khi auth module chua dong bo entity moi.
// Khi sua xong auth, bat lai:
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('management/shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List shifts' })
  @ApiResponse({ status: 200, type: DoctorShiftPaginatedResponseDto })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
   @Query() query: SearchDoctorShiftDto) {
    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) query.facilityId = activeFacilityId;
    const data = await this.service.findAllPaginated(query);
    return { message: RESPONSE_MESSAGES.SHIFTS.FOUND, data };
  }

  @Post('check-conflicts')
  @ApiOperation({ summary: 'Check doctor and room shift conflicts before saving' })
  async checkConflicts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckShiftConflictDto,
  ) {
    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) dto.facilityId = activeFacilityId;
    else assertFacilityAccess(user, dto.facilityId);
    return {
      message: RESPONSE_MESSAGES.SHIFTS.CHECK_CONFLICT_SUCCESS,
      data: await this.service.checkConflicts(dto),
    };
  }

  @Post('bulk-generate/preview')
  @ApiOperation({ summary: 'Preview bulk generated shifts before saving' })
  @ApiBody({
    type: AutoGenerateShiftsDto,
    examples: {
      slotAssignments: {
        summary: 'Generate shifts by slot and staff assignments',
        value: {
          facilityId: '1',
          fromDate: '2026-08-01',
          toDate: '2026-08-31',
          slotAssignments: [
            {
              slotId: '1',
              assignments: [
                {
                  staffId: '10',
                  roleId: '3',
                  roomId: '2',
                  workingDays: ['MON', 'WED', 'FRI'],
                  maxAppointments: 10,
                  status: 'available',
                },
              ],
            },
          ],
          saveOnlyValid: true,
        },
      },
    },
  })
  async previewBulkGenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AutoGenerateShiftsDto,
  ): Promise<AutoGeneratePreviewApiResponse> {
    this.applyFacilityScope(user, dto);
    return {
      message: RESPONSE_MESSAGES.SHIFTS.BULK_GENERATE_PREVIEW_SUCCESS,
      data: await this.service.previewBulkGenerate(dto),
    };
  }

  @Post('bulk-generate/confirm')
  @ApiOperation({ summary: 'Confirm and save valid bulk generated shifts' })
  @ApiBody({
    type: AutoGenerateShiftsDto,
    examples: {
      slotAssignments: {
        summary: 'Generate and save shifts by slot and staff assignments',
        value: {
          facilityId: '1',
          fromDate: '2026-08-01',
          toDate: '2026-08-31',
          slotAssignments: [
            {
              slotId: '1',
              assignments: [
                {
                  staffId: '10',
                  roleId: '3',
                  roomId: '2',
                  workingDays: ['MON', 'WED', 'FRI'],
                  maxAppointments: 10,
                  status: 'available',
                },
              ],
            },
          ],
          saveOnlyValid: true,
        },
      },
    },
  })
  async confirmBulkGenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AutoGenerateShiftsDto,
  ): Promise<AutoGenerateConfirmApiResponse> {
    this.applyFacilityScope(user, dto);
    return {
      message: RESPONSE_MESSAGES.SHIFTS.BULK_GENERATE_CONFIRM_SUCCESS,
      data: await this.service.confirmBulkGenerate(dto),
    };
  }

  @Post('copy-week')
  @ApiOperation({ summary: 'Copy shift schedule from one week to another week' })
  async copyWeek(@Body() dto: CopyWeekDoctorShiftDto) {
    return {
      message: RESPONSE_MESSAGES.SHIFTS.COPY_WEEK_SUCCESS,
      data: await this.service.copyWeek(dto),
    };
  }

  @Get('availability/doctors/:doctorId')
  @ApiOperation({ summary: 'Get available appointment slots of a doctor on a date' })
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
  @ApiOperation({ summary: 'Get weekly shift calendar' })
  @ApiResponse({ status: 200, type: [DoctorShiftResponseDto] })
  async getWeekly(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WeeklyDoctorShiftDto,
  ) {
    const facilityId =
     getActiveFacilityId(user) ?? 
     query.facilityId;
    if (!facilityId) throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.FACILITY_ID_REQUIRED);
     assertFacilityAccess(user, facilityId);
    return {
      message: RESPONSE_MESSAGES.SHIFTS.WEEKLY_SUCCESS,
      data: await this.service.getWeeklySchedule(facilityId, query.weekStart, query.doctorId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift details' })
  @ApiResponse({ status: 200, type: DoctorShiftResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
     @Param('id') id: string) {
    const shift = await this.service.findDetailsById(id);
    assertFacilityAccess(user, shift.facilityId);
    return { message: RESPONSE_MESSAGES.SHIFTS.DETAIL_FOUND, data: shift };
  }

  @Post()
  @ApiOperation({ summary: 'Create shift' })
  async create(
     @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDoctorShiftDto,
  ) {
     const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) dto.facilityId = activeFacilityId;
    return { message: RESPONSE_MESSAGES.SHIFTS.CREATED, data: await this.service.create(dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shift' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorShiftDto,
  ) {
    const existing = await this.service.findById(id);
    assertFacilityAccess(user, existing.facilityId);
    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) dto.facilityId = activeFacilityId;
    return { message: RESPONSE_MESSAGES.SHIFTS.UPDATED, data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shift' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    const existing = await this.service.findById(id);
    if (user) assertFacilityAccess(user, existing.facilityId);
    const data = await this.service.remove(id, reason, user?.id ?? null);
    return { message: RESPONSE_MESSAGES.SHIFTS.DELETED, data };
  }

  private applyFacilityScope(user: AuthenticatedUser | undefined, dto: { facilityId: string }): void {
    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) {
      dto.facilityId = activeFacilityId;
      return;
    }
    assertFacilityAccess(user, dto.facilityId);
  }
}
