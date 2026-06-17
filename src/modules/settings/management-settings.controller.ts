import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingResponseDto } from './dto/response/setting-response.dto';
import { UpdateSettingDto, UpsertSettingDto } from './dto/request/update-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('Management - Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.STAFF)
@Controller('management/settings')
export class ManagementSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions(PermissionEnum.SETTING_VIEW)
  @ApiOperation({ summary: 'List all settings' })
  @ApiResponse({ status: 200, type: [SettingResponseDto] })
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  @Permissions(PermissionEnum.SETTING_VIEW)
  @ApiOperation({ summary: 'Get setting by key' })
  @ApiResponse({ status: 200, type: SettingResponseDto })
  findOne(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Post()
  @Permissions(PermissionEnum.SETTING_UPDATE)
  @ApiOperation({ summary: 'Create or update setting' })
  @ApiResponse({ status: 201, type: SettingResponseDto })
  upsert(@Body() dto: UpsertSettingDto) {
    return this.settingsService.upsert(dto);
  }

  @Patch(':key')
  @Permissions(PermissionEnum.SETTING_UPDATE)
  @ApiOperation({ summary: 'Update setting by key' })
  @ApiResponse({ status: 200, type: SettingResponseDto })
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(key, dto);
  }
}
