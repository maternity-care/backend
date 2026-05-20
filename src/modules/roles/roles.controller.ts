import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
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
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @Permissions(PermissionEnum.ROLE_CREATE)
  @ApiOperation({ summary: 'Create role' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get(':id')
  @Permissions(PermissionEnum.ROLE_VIEW)
  @ApiOperation({ summary: 'Get role detail' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Patch(':id')
  @Permissions(PermissionEnum.ROLE_UPDATE)
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PermissionEnum.ROLE_DELETE)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return { message: 'Role deleted', data: null };
  }
}
