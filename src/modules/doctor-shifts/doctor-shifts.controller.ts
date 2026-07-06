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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DOCTOR_SHIFT_CONSTANT } from '../../common/constants/doctor-shift.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { assertFacilityAccess, getActiveFacilityId } from '../../common/helpers/facility-scope.helper';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { SearchDoctorShiftDto, WeeklyDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import { DoctorShiftsService } from './doctor-shifts.service';

@ApiTags('Management - Doctor Shifts')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('management/doctor-shifts')
export class DoctorShiftsController {
  constructor(private readonly service: DoctorShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List doctor shifts' })
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
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckShiftConflictDto,
  ) {
    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) dto.facilityId = activeFacilityId;
    else assertFacilityAccess(user, dto.facilityId);
    return {
      message: 'Kiểm tra xung đột ca trực thành công',
      data: await this.service.checkConflicts(dto),
    };
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly doctor shift calendar' })
  async getWeekly(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WeeklyDoctorShiftDto,
  ) {
    const facilityId = getActiveFacilityId(user) ?? query.facilityId;
    if (!facilityId) throw new BadRequestException('facilityId là bắt buộc');
    assertFacilityAccess(user, facilityId);
    return {
      message: 'Lấy lịch trực theo tuần thành công',
      data: await this.service.getWeeklySchedule(facilityId, query.weekStart, query.doctorId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor shift details' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const shift = await this.service.findById(id);
    assertFacilityAccess(user, shift.facilityId);
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
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const existing = await this.service.findById(id);
    assertFacilityAccess(user, existing.facilityId);
    await this.service.remove(id);
    return { message: DOCTOR_SHIFT_CONSTANT.DELETED, data: null };
  }
}

