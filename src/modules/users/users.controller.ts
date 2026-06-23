import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('User - Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.usersService.findById(user.id);
    return { message: RESPONSE_MESSAGES.PROFILE_RETRIEVED, data };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    const data = await this.usersService.updateProfile(user.id, dto);
    return { message: RESPONSE_MESSAGES.PROFILE_UPDATED, data };
  }
}
