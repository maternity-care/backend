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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DOCTOR_SHIFT_CONSTANT } from '../../common/constants/doctor-shift.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { assertFacilityAccess, getActiveFacilityId } from '../../common/helpers/facility-scope.helper';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { BulkCreateDoctorShiftDto } from './dto/requests/bulk-create-doctor-shift.dto';
import { CopyWeekDoctorShiftDto } from './dto/requests/copy-week-doctor-shift.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { SearchDoctorShiftDto, WeeklyDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import { DoctorShiftResponseDto } from './dto/responses/doctor-shift-response.dto';
import { DoctorShiftsService } from './doctor-shifts.service';

@ApiTags('Management - Doctor Shifts')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('management/doctor-shifts')
export class DoctorShiftsController {
  constructor(private readonly service: DoctorShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List doctor shifts' })
  @ApiResponse({ status: 200, type: [DoctorShiftResponseDto] })
  async findAll(
    //@CurrentUser() user: AuthenticatedUser,
   @Query() query: SearchDoctorShiftDto) {
    // const activeFacilityId = getActiveFacilityId(user);
    // if (activeFacilityId) query.facilityId = activeFacilityId;
    const data = query.page
      ? await this.service.findAllPaginated(query)
      : await this.service.findAll(query);
    return { message: DOCTOR_SHIFT_CONSTANT.FOUND, data };
  }

  @Post('check-conflicts')
  @ApiOperation({ summary: 'Check doctor and room shift conflicts before saving' })
  async checkConflicts(
    // @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckShiftConflictDto,
  ) {
    // const activeFacilityId = getActiveFacilityId(user);
    // if (activeFacilityId) dto.facilityId = activeFacilityId;
    // else assertFacilityAccess(user, dto.facilityId);
    return {
      message: 'Kiểm tra xung đột ca trực thành công',
      data: await this.service.checkConflicts(dto),
    };
  }

  @Post('bulk-create')
  @ApiOperation({ summary: 'Create many doctor shifts by date range and working days' })
  async bulkCreate(@Body() dto: BulkCreateDoctorShiftDto) {
    return {
      message: 'Tạo ca trực hàng loạt thành công',
      data: await this.service.bulkCreate(dto),
    };
  }

  @Post('copy-week')
  @ApiOperation({ summary: 'Copy doctor shift schedule from one week to another week' })
  async copyWeek(@Body() dto: CopyWeekDoctorShiftDto) {
    return {
      message: 'Copy lịch trực theo tuần thành công',
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
      message: 'Lấy lịch trống của bác sĩ thành công',
      data: await this.service.getDoctorAvailability(doctorId, query),
    };
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly doctor shift calendar' })
  @ApiResponse({ status: 200, type: [DoctorShiftResponseDto] })
  async getWeekly(
    //@CurrentUser() user: AuthenticatedUser,
    @Query() query: WeeklyDoctorShiftDto,
  ) {
    const facilityId =
    //  getActiveFacilityId(user) ?? 
     query.facilityId;
    if (!facilityId) throw new BadRequestException('facilityId là bắt buộc');
    // assertFacilityAccess(user, facilityId);
    return {
      message: 'Lấy lịch trực theo tuần thành công',
      data: await this.service.getWeeklySchedule(facilityId, query.weekStart, query.doctorId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor shift details' })
  @ApiResponse({ status: 200, type: DoctorShiftResponseDto })
  async findOne(
    // @CurrentUser() user: AuthenticatedUser,
     @Param('id') id: string) {
    const shift = await this.service.findDetailsById(id);
    // assertFacilityAccess(user, shift.facilityId);
    return { message: DOCTOR_SHIFT_CONSTANT.DETAIL_FOUND, data: shift };
  }

  @Post()
  @ApiOperation({ summary: 'Create doctor shift' })
  async create(
    // @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDoctorShiftDto,
  ) {
    // const activeFacilityId = getActiveFacilityId(user);
    // if (activeFacilityId) dto.facilityId = activeFacilityId;
    return { message: DOCTOR_SHIFT_CONSTANT.CREATED, data: await this.service.create(dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update doctor shift' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorShiftDto,
  ) {
    const existing = await this.service.findById(id);
    assertFacilityAccess(user, existing.facilityId);
    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) dto.facilityId = activeFacilityId;
    return { message: DOCTOR_SHIFT_CONSTANT.UPDATED, data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete doctor shift' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    const existing = await this.service.findById(id);
    if (user) assertFacilityAccess(user, existing.facilityId);
    const data = await this.service.remove(id, reason, user?.id ?? null);
    return { message: DOCTOR_SHIFT_CONSTANT.DELETED, data };
  }
}
