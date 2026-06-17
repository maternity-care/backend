import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  createPresignedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePresignedUploadDto,
  ) {
    return this.uploadsService.createUserPresignedUpload(user.id, dto);
  }
}
