import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UsersService } from './users.service';
import { UserStatusEnum } from './users.enum';
import { AdminCreateUserDto } from './dto/request/admin-create-user.dto';
import { SearchUserDto } from './dto/request/search-user.dto';
import { SearchUserResponseDto } from './dto/response/search-user-response.dto';

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
  @ApiResponse({ status: 200, type: [SearchUserResponseDto] })
  async findAll(@Query() query: SearchUserDto) {
    const data = await this.usersService.findAllUsers(query);
    return {
      data,
      success: true,
      message: 'Lấy danh sách người dùng thành công.',
    };
  }

  @Post()
  @Permissions(PermissionEnum.USER_CREATE)
  @ApiOperation({ summary: 'Management create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: AdminCreateUserDto) {
    const data = await this.usersService.createUser(dto);
    return {
      data,
      success: true,
      message: 'Tạo người dùng thành công.',
    };
  }

  @Get(':id')
  @Permissions(PermissionEnum.USER_VIEW)
  @ApiOperation({ summary: 'Management get user detail' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findUserById(id);
    return {
      data,
      success: true,
      message: 'Lấy thống tin người dùng thành công.',
    };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.USER_UPDATE)
  @ApiOperation({ summary: 'Management update user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const data = await this.usersService.updateUser(id, dto);
    return {
      data,
      success: true,
      message: 'Cập nhật thông tin người dùng thành công.',
    };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.USER_DELETE)
  @ApiOperation({ summary: 'Management delete user' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.usersService.updateStatus(id, UserStatusEnum.INACTIVE);
    return { success: true, message: 'Đã xóa mềm thông tin người dùng.' };
  }
}
