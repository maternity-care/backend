import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MEDICAL_RECORD_MESSAGES } from './medical-record.constant';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('Management - Medical Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get medical record details' })
  async findOne(@Param('id') id: string) {
    return {
      message: MEDICAL_RECORD_MESSAGES.DETAIL_FOUND,
      data: await this.service.findById(id),
    };
  }
}
