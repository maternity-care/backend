import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Management - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/users')
export class ManagementUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PermissionEnum.USER_VIEW)
  @ApiOperation({ summary: 'Management list users' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Permissions(PermissionEnum.USER_CREATE)
  @ApiOperation({ summary: 'Management create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @Permissions(PermissionEnum.USER_VIEW)
  @ApiOperation({ summary: 'Management get user detail' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Permissions(PermissionEnum.USER_UPDATE)
  @ApiOperation({ summary: 'Management update user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PermissionEnum.USER_DELETE)
  @ApiOperation({ summary: 'Management delete user' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted', data: null };
  }
}
