import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PregnancyProfileService } from './pregnancy-profile.service';
import { CreatePregnancyProfileDto } from './dto/request/create-pregnancy-profile.dto';
import { UpdatePregnancyProfileDto } from './dto/request/update-pregnancy-profile.dto';
import { PregnancyProfileResponseDto } from './dto/response/pregnancy-profile-response.dto';
import { RESPONSE_MESSAGES } from 'src/common/constants/response-message.constant';

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
    const profiles = await this.pregnancyProfileService.findMyProfile(user.id);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_SUCCESS, data: profiles };
  }

  @Post()
  @ApiOperation({ summary: 'Create pregnancy profile' })
  @ApiResponse({ status: 201, type: PregnancyProfileResponseDto })
  async createMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePregnancyProfileDto) {
    const profile = await this.pregnancyProfileService.create(user.id, dto, user);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.CREATED_SUCCESS, data: profile };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my pregnancy profile detail' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async findMineById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const profile = await this.pregnancyProfileService.findById(id);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_SUCCESS, data: profile };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update my pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async updateMine(@Param('id') id: string, @Body() dto: UpdatePregnancyProfileDto) {
    const profile = await this.pregnancyProfileService.update(id, dto);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.UPDATED, data: profile };
  }

  @Post('soft-delete/:id') // bác sĩ yêu cầu xóa mềm hồ sơ, gửi yêu cầu chờ thai phụ đồng ý xóa hồ sơ
  @ApiOperation({ summary: 'Soft delete pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    await this.pregnancyProfileService.createRequestSoftDelete(user, id, reason);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.DELETED, data: null };
  }

  @Patch('soft-delete/:id') // thai phụ đồng ý hoặc từ chối xóa mềm hồ sơ
  @ApiOperation({ summary: 'Confirm/reject soft delete pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async confirmSoftDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('confirmed') confirmed: boolean,
  ) {
    const profile = await this.pregnancyProfileService.confirmSoftDelete(user.id, id, confirmed);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.DELETED, data: profile };
  }
}
