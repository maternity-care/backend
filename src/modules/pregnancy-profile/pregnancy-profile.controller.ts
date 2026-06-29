import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PregnancyProfileService } from './pregnancy-profile.service';
import { CreatePregnancyProfileDto } from './dto/request/create-pregnancy-profile.dto';
import { UpdatePregnancyProfileDto } from './dto/request/update-pregnancy-profile.dto';
import { PregnancyProfileResponseDto } from './dto/response/pregnancy-profile-response.dto';
// import { PermissionEnum } from '../../common/constants/permission.enum';
// import { Permissions } from '../../common/decorators/permissions.decorator';
// import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Pregnancy Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pregnancy-profiles')
export class PregnancyProfileController {
  constructor(private readonly pregnancyProfileService: PregnancyProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get my pregnancy profiles' })
  @ApiResponse({ status: 200, type: [PregnancyProfileResponseDto] })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    const profiles = await this.pregnancyProfileService.findMyProfiles(user.id);
    return { message: 'Lấy danh sách hồ sơ thai sản thành công', data: profiles };
  }

  @Post()
  @ApiOperation({ summary: 'Create pregnancy profile' })
  @ApiResponse({ status: 201, type: PregnancyProfileResponseDto })
  async createMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePregnancyProfileDto) {
    const profile = await this.pregnancyProfileService.create(user.id, dto, user.id);
    return { message: 'Tạo hồ sơ thai sản thành công', data: profile };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my pregnancy profile detail' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async findMineById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const profile = await this.pregnancyProfileService.findByIdForPatient(id, user.id);
    return { message: 'Lấy thông tin hồ sơ thai sản thành công', data: profile };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update my pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePregnancyProfileDto,
  ) {
    const profile = await this.pregnancyProfileService.updateByPatient(id, user.id, dto);
    return { message: 'Cập nhật hồ sơ thai sản thành công', data: profile };
  }
}
