import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { UpdateFacilityOperatingHoursDto } from './dto/requests/update-facility-operating-hours.dto';
import { ApplyFacilityOperatingHoursDto } from './dto/requests/apply-facility-operating-hours.dto';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import {
  FacilityAdminOptionsPaginatedResponseDto,
  FacilityPaginatedResponseDto,
  FacilityResponseDto,
} from './dto/responds/facilities-respond';
import { SearchFacilityAdminOptionsDto } from './dto/requests/search-facility-admin-options.dto';
import { HttpException } from '@nestjs/common';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
} from '../../common/helpers/facility-scope.helper';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuspendResourceDto } from '../../common/dto/suspend-resource.dto';

@ApiTags('Management - Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR);
  }

  @Get()
  @Permissions(PermissionEnum.FACILITY_VIEW)
  @ApiOperation({ summary: 'List facilities' })
  @ApiResponse({ status: 200, description: 'Facilities found', type: FacilityPaginatedResponseDto })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchFacilityDto,
  ) {
    try {
      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        const facility = await this.facilitiesService.findDetailsById(activeFacilityId);
        const page = Math.max(1, Number(query?.page) || 1);
        const limit = Math.max(1, Number(query?.limit) || 20);
        return {
          message: RESPONSE_MESSAGES.FACILITIES.GET_LIST_SUCCESS,
          data: {
            items: [facility],
            total: 1,
            page,
            limit,
            totalPages: 1,
          },
        };
      }

      // nếu client gửi page => trả về kết quả phân trang
      if (query?.page) {
        const paged = await this.facilitiesService.findAllPaginated(query);
        return {
          message: RESPONSE_MESSAGES.FACILITIES.GET_LIST_SUCCESS,
          data: paged,
        };
      }

      const facilities = await this.facilitiesService.findAllPaginated(query);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.GET_LIST_SUCCESS,
        data: facilities,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('admin-options')
  @Permissions(PermissionEnum.FACILITY_VIEW)
  @ApiOperation({ summary: 'List admin accounts for assigning as facility owner/admin' })
  @ApiResponse({ status: 200, type: FacilityAdminOptionsPaginatedResponseDto })
  async findAdminOptions(@Query() query: SearchFacilityAdminOptionsDto) {
    try {
      return {
        message: RESPONSE_MESSAGES.FACILITIES.ADMIN_OPTIONS_SUCCESS,
        data: await this.facilitiesService.findAdminOptions(query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':id')
  @Permissions(PermissionEnum.FACILITY_VIEW)
  @ApiOperation({ summary: 'Get facility details' })
  @ApiResponse({ status: 200, type: FacilityResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    try {
      assertFacilityAccess(user, id);
      const facility = await this.facilitiesService.findDetailsById(id);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.GET_SUCCESS,
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post()
  @Permissions(PermissionEnum.FACILITY_CREATE)
  @ApiOperation({ summary: 'Create facility' })
  @ApiResponse({ status: 201, type: FacilityResponseDto })
  async create(@Body() dto: CreateFacilityDto) {
    try {
      const facility = await this.facilitiesService.create(dto);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.CREATED,
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post(':id/operating-hours/preview')
  @Permissions(PermissionEnum.FACILITY_UPDATE)
  @ApiOperation({ summary: 'Preview facility operating hour changes and impacted upcoming shifts' })
  async previewOperatingHours(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityOperatingHoursDto,
  ) {
    try {
      assertFacilityAccess(user, id);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_PREVIEW_SUCCESS,
        data: await this.facilitiesService.previewOperatingHours(id, dto),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id/operating-hours/apply')
  @Permissions(PermissionEnum.FACILITY_UPDATE)
  @ApiOperation({ summary: 'Apply facility operating hour changes with slot handling strategy' })
  async applyOperatingHours(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApplyFacilityOperatingHoursDto,
  ) {
    try {
      assertFacilityAccess(user, id);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_UPDATED,
        data: await this.facilitiesService.applyOperatingHours(id, dto),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id')
  @Permissions(PermissionEnum.FACILITY_UPDATE)
  @ApiOperation({ summary: 'Update facility' })
  @ApiResponse({ status: 200, type: FacilityResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    try {
      assertFacilityAccess(user, id);
      const data = await this.facilitiesService.update(id, dto);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.UPDATED,
        data: data,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id/suspend')
  @Permissions(PermissionEnum.FACILITY_UPDATE)
  @ApiOperation({ summary: 'Suspend facility for a period or indefinitely' })
  @ApiResponse({ status: 200 })
  async suspend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SuspendResourceDto,
  ) {
    try {
      assertFacilityAccess(user, id);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.STATUS_UPDATED,
        data: await this.facilitiesService.suspend(id, dto, user?.id ?? null),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id/reactivate')
  @Permissions(PermissionEnum.FACILITY_UPDATE)
  @ApiOperation({ summary: 'Reactivate suspended facility' })
  @ApiResponse({ status: 200 })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    try {
      assertFacilityAccess(user, id);
      return {
        message: RESPONSE_MESSAGES.FACILITIES.STATUS_UPDATED,
        data: await this.facilitiesService.reactivate(id, user?.id ?? null),
      };
    } catch (error) {
      this.handleError(error);
    }
  }


  @Delete(':id')
  @Permissions(PermissionEnum.FACILITY_DELETE)
  @ApiOperation({ summary: 'Delete facility' })
  @ApiResponse({ status: 200 })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    try {
      assertFacilityAccess(user, id);
      const data = await this.facilitiesService.remove(id, reason, user?.id ?? null);
      return { message: RESPONSE_MESSAGES.FACILITIES.DELETED, data };
    } catch (error) {
      this.handleError(error);
    }
  }

}
