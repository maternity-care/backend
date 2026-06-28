import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/request/forgot-password.dto';
import { LoginDto } from './dto/request/login.dto';
import { LogoutDto } from './dto/request/logout.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { ResetPasswordDto } from './dto/request/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { UpdateManagementProfileDto } from './dto/request/update-management-profile.dto';
import { ChangeManagementPasswordDto } from './dto/request/change-management-password.dto';

@ApiTags('Management - Auth')
@Controller('management/auth')
export class ManagementAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login staff' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.managementLogin(dto);
    return { message: RESPONSE_MESSAGES.AUTH_LOGGED_IN, data };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.managementForgotPassword(dto.email);
    return { message: RESPONSE_MESSAGES.PASSWORD_RESET_REQUESTED, data };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.managementResetPassword(dto.token, dto.password);
    return { message: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS, data: null };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.managementRefresh(dto.refresh_token);
    return { message: RESPONSE_MESSAGES.AUTH_REFRESHED, data };
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    await this.authService.managementLogout(dto.refresh_token);
    return { message: RESPONSE_MESSAGES.LOGGED_OUT, data: null };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() staff: AuthenticatedUser) {
    return { message: RESPONSE_MESSAGES.AUTH_PROFILE_RETRIEVED, data: staff };
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() staff: AuthenticatedUser,
    @Body() dto: UpdateManagementProfileDto,
  ) {
    const data = await this.authService.updateManagementProfile(staff.id, dto);
    return { message: RESPONSE_MESSAGES.MANAGEMENT_PROFILE_UPDATED, data };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() staff: AuthenticatedUser,
    @Body() dto: ChangeManagementPasswordDto,
  ) {
    await this.authService.changeManagementPassword(staff.email, dto);
    return {
      message: RESPONSE_MESSAGES.MANAGEMENT_PASSWORD_CHANGED,
      data: null,
    };
  }
}
