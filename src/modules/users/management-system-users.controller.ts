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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/request/create-user.dto';
import { SearchUserDto } from './dto/request/search-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { UserStatusEnum } from './users.enum';
import { UsersService } from './users.service';

@ApiTags('Management - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN)
@Controller('management/users')
export class ManagementSystemUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PermissionEnum.USER_VIEW)
  async findAll(@Query() query: SearchUserDto) {
    const data = await this.usersService.searchUsers(query);
    return { data, success: true, message: 'Lấy danh sách người dùng thành công.' };
  }

  @Post()
  @Permissions(PermissionEnum.USER_CREATE)
  async create(@Body() dto: CreateUserDto) {
    const data = await this.usersService.create(dto);
    return { data, success: true, message: 'Tạo người dùng thành công.' };
  }

  @Get(':id')
  @Permissions(PermissionEnum.USER_VIEW)
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findById(id);
    return { data, success: true, message: 'Lấy thông tin người dùng thành công.' };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.USER_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const data = await this.usersService.update(id, dto);
    return { data, success: true, message: 'Cập nhật người dùng thành công.' };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.USER_DELETE)
  async remove(@Param('id') id: string) {
    await this.usersService.updateStatus(id, UserStatusEnum.INACTIVE);
    return { data: null, success: true, message: 'Đã khóa tài khoản người dùng.' };
  }
}
