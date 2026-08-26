import { CurrentUser } from './../../common/decorators/current-user.decorator';
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
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/constants/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMedicalRecordDto } from './dto/requests/create-medical-record.dto';
import { ListPendingMedicalFilesDto } from './dto/requests/pending-medical-file.dto';
import { SearchMedicalRecordDto } from './dto/requests/search-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/requests/update-medical-record.dto';
import { MEDICAL_RECORD_MESSAGES } from './medical-record.constant';
import { MedicalRecordsService } from './medical-records.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Management - Medical Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.DOCTOR)
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

  @Get('pending-files')
  @ApiOperation({ summary: 'List helper-uploaded pending files for an appointment' })
  async listPendingFiles(@Query() query: ListPendingMedicalFilesDto) {
    return {
      message: MEDICAL_RECORD_MESSAGES.FOUND,
      data: await this.service.listPendingFiles(query.appointmentId),
    };
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
  async create(@Body() dto: CreateMedicalRecordDto, @CurrentUser() user: AuthenticatedUser) {
    dto.files?.forEach((file) => {
      file.uploadedBy = user.id;
    });
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

  @Patch(':id/publish')
  @Roles(RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'Publish a medical record to the patient' })
  async publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return {
      message: MEDICAL_RECORD_MESSAGES.PUBLISHED,
      data: await this.service.publish(id, user),
    };
  }

  @Patch(':id/unpublish')
  @Roles(RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'Unpublish a medical record from the patient' })
  async unpublish(@Param('id') id: string) {
    return {
      message: MEDICAL_RECORD_MESSAGES.UNPUBLISHED,
      data: await this.service.unpublish(id),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a medical record without attached files' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: MEDICAL_RECORD_MESSAGES.DELETED, data: null };
  }
}
