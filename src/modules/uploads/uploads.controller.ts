import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreatePresignedUploadDto } from './dto/request/create-presigned-upload.dto';
import { PresignedUploadResponseDto } from './dto/response/presigned-upload-response.dto';
import { UploadsService } from './uploads.service';

@ApiTags('User - Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Create user presigned upload URL' })
  @ApiResponse({ status: 201, type: PresignedUploadResponseDto })
  async createPresignedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePresignedUploadDto,
  ) {
    const data = await this.uploadsService.createUserPresignedUpload(user.id, dto);
    return { message: RESPONSE_MESSAGES.USER_UPLOAD_PRESIGN_CREATED, data };
  }
}
