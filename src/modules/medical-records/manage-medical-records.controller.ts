import {
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMedicalRecordDto } from './dto/requests/create-medical-record.dto';
import { SearchMedicalRecordDto } from './dto/requests/search-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/requests/update-medical-record.dto';
import { MEDICAL_RECORD_MESSAGES } from './medical-record.constant';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('Management - Medical Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('management/medical-records')
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List and search medical records' })
  async findAll(@Query() query: SearchMedicalRecordDto) {
    const data = query.page
      ? await this.service.findAllPaginated(query)
      : await this.service.findAll(query);
    return { message: MEDICAL_RECORD_MESSAGES.FOUND, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medical record details' })
  async findOne(@Param('id') id: string) {
    return {
      message: MEDICAL_RECORD_MESSAGES.DETAIL_FOUND,
      data: await this.service.findById(id),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a medical record' })
  async create(@Body() dto: CreateMedicalRecordDto) {
    return {
      message: MEDICAL_RECORD_MESSAGES.CREATED,
      data: await this.service.create(dto),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a medical record' })
  async update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
    return {
      message: MEDICAL_RECORD_MESSAGES.UPDATED,
      data: await this.service.update(id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medical record without attached files' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: MEDICAL_RECORD_MESSAGES.DELETED, data: null };
  }
}
