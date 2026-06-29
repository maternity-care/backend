import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PregnancyProfileService } from './pregnancy-profile.service';
import { CreatePregnancyProfileDto } from './dto/request/create-pregnancy-profile.dto';
import { UpdatePregnancyProfileDto } from './dto/request/update-pregnancy-profile.dto';
import { PregnancyProfileResponseDto } from './dto/response/pregnancy-profile-response.dto';
import { PermissionEnum } from '../../common/constants/permission.enum';

@ApiTags('Management - Pregnancy Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/pregnancy-profiles')
export class ManagementPregnancyProfileController {
  constructor(private readonly pregnancyProfileService: PregnancyProfileService) {}

  @Post('patients/:patientId')
  @Permissions(PermissionEnum.PREGNANCY_CREATE)
  @ApiOperation({ summary: 'Create pregnancy profile for a patient' })
  @ApiResponse({ status: 201, type: PregnancyProfileResponseDto })
  async createForPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePregnancyProfileDto,
  ) {
    const profile = await this.pregnancyProfileService.create(patientId, dto, user.id);
    return { message: 'Tạo hồ sơ thai sản cho thai phụ thành công', data: profile };
  }

  @Get('patients/:patientId')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'List pregnancy profiles for a patient' })
  @ApiResponse({ status: 200, type: [PregnancyProfileResponseDto] })
  async findByPatient(@Param('patientId') patientId: string) {
    const profiles = await this.pregnancyProfileService.findMyProfiles(patientId);
    return { message: 'Lấy danh sách hồ sơ thai sản của thai phụ thành công', data: profiles };
  }

  @Get(':id')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'Get pregnancy profile detail' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async findOne(@Param('id') id: string) {
    const profile = await this.pregnancyProfileService.findById(id);
    return { message: 'Lấy thông tin hồ sơ thai sản thành công', data: profile };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.PREGNANCY_UPDATE)
  @ApiOperation({ summary: 'Update pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdatePregnancyProfileDto) {
    const profile = await this.pregnancyProfileService.update(id, dto);
    return { message: 'Cập nhật hồ sơ thai sản thành công', data: profile };
  }
}
