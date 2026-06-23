import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePermissionDto } from './dto/request/create-permission.dto';
import { UpdatePermissionDto } from './dto/request/update-permission.dto';
import { PermissionResponseDto } from './dto/response/permission-response.dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Management - Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions(PermissionEnum.PERMISSION_VIEW)
  @ApiOperation({ summary: 'List permissions' })
  @ApiResponse({ status: 200, type: [PermissionResponseDto] })
  async findAll() {
    const data = await this.permissionsService.findAll();
    return { message: RESPONSE_MESSAGES.PERMISSIONS_RETRIEVED, data };
  }

  @Post()
  @Permissions(PermissionEnum.PERMISSION_CREATE)
  @ApiOperation({ summary: 'Create permission' })
  @ApiResponse({ status: 201, type: PermissionResponseDto })
  async create(@Body() dto: CreatePermissionDto) {
    const data = await this.permissionsService.create(dto);
    return { message: RESPONSE_MESSAGES.PERMISSION_CREATED, data };
  }

  @Get(':id')
  @Permissions(PermissionEnum.PERMISSION_VIEW)
  @ApiOperation({ summary: 'Get permission detail' })
  @ApiResponse({ status: 200, type: PermissionResponseDto })
  async findOne(@Param('id') id: string) {
    const data = await this.permissionsService.findById(id);
    return { message: RESPONSE_MESSAGES.PERMISSION_RETRIEVED, data };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.PERMISSION_UPDATE)
  @ApiOperation({ summary: 'Update permission' })
  @ApiResponse({ status: 200, type: PermissionResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    const data = await this.permissionsService.update(id, dto);
    return { message: RESPONSE_MESSAGES.PERMISSION_UPDATED, data };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.PERMISSION_DELETE)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.permissionsService.remove(id);
    return { message: RESPONSE_MESSAGES.PERMISSION_DELETED, data: null };
  }
}
