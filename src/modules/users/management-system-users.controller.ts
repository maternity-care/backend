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
import { SearchUserDto } from './dto/request/search-user.dto';
import { UpdatePregnantUserDto } from './dto/request/update-pregnant-user.dto';
import { UserStatusEnum } from './users.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/request/create-user.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { LockUserDto } from './dto/request/admin-lock-user.dto';

@ApiTags('Management - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.DOCTOR, RoleEnum.STAFF, RoleEnum.NURSE)
@Controller('management/users')
export class ManagementSystemUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.DOCTOR)
  async findAll(@Query() query: SearchUserDto, @CurrentUser() currentUser: AuthenticatedUser) {
    const data = await this.usersService.searchUsers(query, currentUser);
    return { data, success: true, message: 'Lấy danh sách người dùng thành công.' };
  }

  @Get('no-pregnant')
  async findAllNoPregnant(@CurrentUser() currentUser: AuthenticatedUser) {
    const data = await this.usersService.findAllNoPregnant(currentUser.id);
    return { data, success: true, message: 'Lấy thông tin người dùng không mang thai thành công.' };
  }

  @Post()
  // @Permissions(PermissionEnum.USER_CREATE)
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
  async update(@Param('id') id: string, @Body() dto: UpdatePregnantUserDto) {
    const data = await this.usersService.update(id, dto);
    return { data, success: true, message: 'Cập nhật người dùng thành công.' };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.USER_DELETE)
  async remove(@Param('id') id: string, @Body() dto: LockUserDto) {
    await this.usersService.updateStatus(id, UserStatusEnum.INACTIVE, dto.reason);
    return { data: null, success: true, message: 'Đã khóa tài khoản người dùng.' };
  }
}
