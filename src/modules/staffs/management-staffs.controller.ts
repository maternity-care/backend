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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdminCreateUserDto } from '../users/dto/request/admin-create-user.dto';
import { SearchUserDto } from '../users/dto/request/search-user.dto';
import { UpdateUserDto } from '../users/dto/request/update-user.dto';
import { SearchUserResponseDto } from '../users/dto/response/search-user-response.dto';
import { UserResponseDto } from '../users/dto/response/user-response.dto';
import { UserStatusEnum } from '../users/users.enum';
import { StaffManagementService } from './staff-management.service';

@ApiTags('Management - Staffs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/staffs')
export class ManagementStaffsController {
  constructor(
    private readonly staffManagementService: StaffManagementService,
  ) {}

  @Get()
  @Permissions(PermissionEnum.USER_VIEW)
  @ApiOperation({ summary: 'List staff accounts' })
  @ApiResponse({ status: 200, type: SearchUserResponseDto })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: SearchUserDto,
  ) {
    const data = await this.staffManagementService.findAll(query, actor);
    return { data, message: 'Lấy danh sách nhân viên thành công.' };
  }

  @Post()
  @Permissions(PermissionEnum.USER_CREATE)
  @ApiOperation({ summary: 'Create staff account' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: AdminCreateUserDto,
  ) {
    const data = await this.staffManagementService.create(dto, actor);
    return { data, message: 'Tạo nhân viên thành công.' };
  }

  @Get(':id')
  @Permissions(PermissionEnum.USER_VIEW)
  async findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const data = await this.staffManagementService.findById(id, actor);
    return { data, message: 'Lấy thông tin nhân viên thành công.' };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.USER_UPDATE)
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const data = await this.staffManagementService.update(id, dto, actor);
    return { data, message: 'Cập nhật nhân viên thành công.' };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.USER_DELETE)
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.staffManagementService.updateStatus(
      id,
      UserStatusEnum.INACTIVE,
      actor,
    );
    return { data: null, message: 'Đã khóa tài khoản nhân viên.' };
  }
}
