import { RESPONSE_MESSAGES } from './../../common/constants/response-message.constant';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PregnancyProfileService } from './pregnancy-profile.service';
import { CreatePregnancyProfileDto } from './dto/request/create-pregnancy-profile.dto';
import { UpdatePregnancyProfileDto } from './dto/request/update-pregnancy-profile.dto';
import { PregnancyProfileResponseDto } from './dto/response/pregnancy-profile-response.dto';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { SearchProfileQueryDto } from './dto/request/search-pregnancy-profiles.dto';
import { RoleEnum } from '../../common/constants/role.enum';
import { PregnancyProfile } from './entities/pregnancy-profile.entity';

@ApiTags('Management - Pregnancy Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/pregnancy-profiles')
export class ManagementPregnancyProfileController {
  constructor(private readonly pregnancyProfileService: PregnancyProfileService) {}

  private getRoleNames(user: AuthenticatedUser): string[] {
    return [
      ...(user.roles ?? []),
      ...(user.facilityRoles ?? []),
      user.facilityRole,
      ...(user.facilities ?? []).flatMap((facility) => [
        ...(facility.roles ?? []),
        facility.role,
      ]),
    ]
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .map((role) => role.name);
  }

  private shouldHideMedicalRecords(user: AuthenticatedUser): boolean {
    const roles = new Set(this.getRoleNames(user));

    return (
      roles.has(RoleEnum.STAFF) &&
      !roles.has(RoleEnum.DOCTOR) &&
      !roles.has(RoleEnum.ADMIN) &&
      !roles.has(RoleEnum.SUPER_ADMIN)
    );
  }

  private stripMedicalRecordsForStaff<T extends PregnancyProfile | PregnancyProfile[]>(
    value: T,
    user: AuthenticatedUser,
  ): T {
    if (!this.shouldHideMedicalRecords(user)) {
      return value;
    }

    const strip = (profile: PregnancyProfile): PregnancyProfile => ({
      ...profile,
      medicalRecords: [],
    });

    return (Array.isArray(value) ? value.map(strip) : strip(value)) as T;
  }

  @Post('patients/:patientId')
  @Permissions(PermissionEnum.PREGNANCY_CREATE)
  @ApiOperation({ summary: 'Create pregnancy profile for a patient' })
  @ApiResponse({ status: 201, type: PregnancyProfileResponseDto })
  async createForPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePregnancyProfileDto,
  ) {
    const profile = await this.pregnancyProfileService.create(patientId, dto, user);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.CREATED_SUCCESS, data: profile };
  }

  @Get()
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'List pregnancy profiles' })
  @ApiResponse({ status: 200, type: [PregnancyProfileResponseDto] })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchProfileQueryDto) {
    const profiles = await this.pregnancyProfileService.searchProfiles(query);
    return {
      message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_LIST_SUCCESS,
      data: {
        ...profiles,
        data: this.stripMedicalRecordsForStaff(profiles.data, user),
      },
    };
  }

  @Get('patients/:patientId')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'List pregnancy profiles for a patient' })
  @ApiResponse({ status: 200, type: [PregnancyProfileResponseDto] })
  async findByPatientId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    const profiles = await this.pregnancyProfileService.findByPatientId(patientId);
    return {
      message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_SUCCESS,
      data: this.stripMedicalRecordsForStaff(profiles, user),
    };
  }

  @Get(':id')
  @Permissions(PermissionEnum.PREGNANCY_VIEW)
  @ApiOperation({ summary: 'Get pregnancy profile detail' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const profile = await this.pregnancyProfileService.findById(id);
    return {
      message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.GET_SUCCESS,
      data: this.stripMedicalRecordsForStaff(profile, user),
    };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.PREGNANCY_UPDATE)
  @ApiOperation({ summary: 'Update pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdatePregnancyProfileDto) {
    const profile = await this.pregnancyProfileService.update(id, dto);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.UPDATED, data: profile };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.PREGNANCY_DELETE)
  @ApiOperation({ summary: 'Delete pregnancy profile' })
  @ApiResponse({ status: 200, type: PregnancyProfileResponseDto })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason: string,
  ) {
    await this.pregnancyProfileService.softDelete(user.id, id, reason);
    return { message: RESPONSE_MESSAGES.PREGNANCY_PROFILES.DELETED, data: null };
  }
}
