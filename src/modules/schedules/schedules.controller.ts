import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserScheduleDto } from './dto/create-user-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('User Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get my schedules' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: RESPONSE_MESSAGES.SCHEDULES.GET_LIST_SUCCESS,
      data: await this.schedulesService.findMine(user.id),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create my schedule' })
  async createMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserScheduleDto) {
    return {
      message: RESPONSE_MESSAGES.SCHEDULES.CREATED,
      data: await this.schedulesService.createMine(user.id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete my manual schedule' })
  async removeMine(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      message: RESPONSE_MESSAGES.SCHEDULES.DELETED,
      data: await this.schedulesService.removeMine(user.id, id),
    };
  }
}
