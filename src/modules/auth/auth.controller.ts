import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthResponseDto } from './dto/response/auth-response.dto';
import { ForgotPasswordDto } from './dto/request/forgot-password.dto';
import { LoginDto } from './dto/request/login.dto';
import { LogoutDto } from './dto/request/logout.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { RegisterDto } from './dto/request/register.dto';
import { ResetPasswordDto } from './dto/request/reset-password.dto';
import { ForgotPasswordResponseDto } from './dto/response/forgot-password-response.dto';
import { AuthService } from './auth.service';

@ApiTags('User - Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, type: ForgotPasswordResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto.email);
    return { message: RESPONSE_MESSAGES.PASSWORD_RESET_REQUESTED, data };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password by token' })
  @ApiResponse({ status: 200 })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS, data: null };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token' })
  @ApiResponse({ status: 200 })
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refresh_token);
    return { message: RESPONSE_MESSAGES.LOGGED_OUT, data: null };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200 })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
