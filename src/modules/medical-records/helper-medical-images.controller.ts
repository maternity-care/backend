import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CreateManagementPresignedUploadDto } from '../uploads/dto/request/create-presigned-upload.dto';
import { UploadsService } from '../uploads/uploads.service';
import { RegisterPendingMedicalFileDto } from './dto/requests/pending-medical-file.dto';
import { HelperUploadSecretGuard } from './guards/helper-upload-secret.guard';
import { MEDICAL_RECORD_MESSAGES } from './medical-record.constant';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('Helper - Medical Images')
@ApiHeader({ name: 'X-Helper-Secret', required: true })
@UseGuards(HelperUploadSecretGuard)
@Controller('helper/medical-images')
export class HelperMedicalImagesController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly medicalRecordsService: MedicalRecordsService,
  ) {}

  @Post('presign')
  @ApiOperation({ summary: 'Create helper presigned upload URL' })
  async createPresignedUpload(@Body() dto: CreateManagementPresignedUploadDto) {
    const data = await this.uploadsService.createManagementPresignedUpload(
      dto,
      'medical-image-helper',
    );
    return { message: RESPONSE_MESSAGES.MANAGEMENT_UPLOAD_PRESIGN_CREATED, data };
  }

  @Post('pending-files')
  @ApiOperation({ summary: 'Register a helper-uploaded pending medical file' })
  async registerPendingFile(@Body() dto: RegisterPendingMedicalFileDto) {
    return {
      message: MEDICAL_RECORD_MESSAGES.CREATED,
      data: await this.medicalRecordsService.registerPendingFile(dto),
    };
  }
}
