import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { RoleEnum } from '../../common/constants/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateManagementPresignedUploadDto } from './dto/request/create-presigned-upload.dto';
import { PresignedUploadResponseDto } from './dto/response/presigned-upload-response.dto';
import { UploadsService } from './uploads.service';

@ApiTags('Management - Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF)
@Controller('management/uploads')
export class ManagementUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Create management presigned upload URL' })
  @ApiResponse({ status: 201, type: PresignedUploadResponseDto })
  async createPresignedUpload(@Body() dto: CreateManagementPresignedUploadDto) {
    const data = await this.uploadsService.createManagementPresignedUpload(dto);
    return { message: RESPONSE_MESSAGES.MANAGEMENT_UPLOAD_PRESIGN_CREATED, data };
  }
}
