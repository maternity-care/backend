import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { RoleEnum } from '../../common/constants/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTestJobDto } from './dto/request/create-test-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('Management - Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('test')
  @ApiOperation({ summary: 'Create test queue job' })
  @ApiResponse({ status: 201 })
  async createTestJob(@Body() dto: CreateTestJobDto) {
    const data = await this.jobsService.createTestJob(dto);
    return { message: RESPONSE_MESSAGES.TEST_JOB_CREATED, data };
  }
}
