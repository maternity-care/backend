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
import { CreateRoleDto } from './dto/request/create-role.dto';
import { UpdateRoleDto } from './dto/request/update-role.dto';
import { RoleResponseDto } from './dto/response/role-response.dto';
import { RolesService } from './roles.service';

@ApiTags('Management - Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions(PermissionEnum.ROLE_VIEW)
  @ApiOperation({ summary: 'List roles' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async findAll() {
    const data = await this.rolesService.findAll();
    return { message: RESPONSE_MESSAGES.ROLES_RETRIEVED, data };
  }

  @Post()
  @Permissions(PermissionEnum.ROLE_CREATE)
  @ApiOperation({ summary: 'Create role' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(@Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create(dto);
    return { message: RESPONSE_MESSAGES.ROLE_CREATED, data };
  }

  @Get(':id')
  @Permissions(PermissionEnum.ROLE_VIEW)
  @ApiOperation({ summary: 'Get role detail' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async findOne(@Param('id') id: string) {
    const data = await this.rolesService.findById(id);
    return { message: RESPONSE_MESSAGES.ROLE_RETRIEVED, data };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.ROLE_UPDATE)
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const data = await this.rolesService.update(id, dto);
    return { message: RESPONSE_MESSAGES.ROLE_UPDATED, data };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.ROLE_DELETE)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return { message: RESPONSE_MESSAGES.ROLE_DELETED, data: null };
  }
}
