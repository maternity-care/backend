import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { LookupFacilityDto, SearchFacilityDto } from './dto/requests/search-facility.dto';
import { FacilityLookupResponseDto, FacilityResponseDto } from './dto/responds/facilities-respond';
import { HttpException } from '@nestjs/common';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
} from '../../common/helpers/facility-scope.helper';
@ApiTags('Management - Facilities')
// TEMP DEV: Auth/RolesGuard dang duoc tam tat de test facility khi auth module chua dong bo entity moi.
// Khi sua xong auth, bat lai:
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException('Internal server error');
  }

  @Get()
  @ApiOperation({ summary: 'List facilities' })
  @ApiResponse({ status: 200, description: 'Facilities found', type: [FacilityResponseDto] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchFacilityDto,
  ) {
    try {
      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        const facility = await this.facilitiesService.findDetailsById(activeFacilityId);
        return {
          message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
          data: query?.page
            ? { items: [facility], total: 1, page: Number(query.page), limit: 1 }
            : [facility],
        };
      }

      // nếu client gửi page => trả về kết quả phân trang
      if (query?.page) {
        const paged = await this.facilitiesService.findAllPaginated(query);
        return {
          message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
          data: paged,
        };
      }

      const facilities = await this.facilitiesService.findAll(query);
      return {
        message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
        data: facilities,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup facilities for select/autocomplete' })
  @ApiResponse({ status: 200, type: [FacilityLookupResponseDto] })
  async lookup(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LookupFacilityDto,
  ) {
    try {
      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        const facility = await this.facilitiesService.findDetailsById(activeFacilityId);
        return {
          message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
          data: [{
            id: facility.id,
            name: facility.name,
            code: facility.code,
            address: facility.address,
            province: facility.province,
            ward: facility.ward,
            status: facility.status,
            ownerName: facility.ownerName,
          }],
        };
      }

      return {
        message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
        data: await this.facilitiesService.lookup(query),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':id')
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
        message: RESPONSE_MESSAGES.FACILITY_RETRIEVED,
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post()
  // TEMP DEV: route create facility tam thoi chua gan @Roles(RoleEnum.SUPER_ADMIN).
  @ApiOperation({ summary: 'Create facility' })
  @ApiResponse({ status: 201, type: FacilityResponseDto })
  async create(@Body() dto: CreateFacilityDto) {
    try {
      const facility = await this.facilitiesService.create(dto);
      return {
        message: RESPONSE_MESSAGES.FACILITY_CREATED,
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id')
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
        message: RESPONSE_MESSAGES.FACILITY_UPDATED,
        data: data,
      };
    } catch (error) {
      this.handleError(error);
    }
  }



  @Delete(':id')
  // TEMP DEV: route delete facility tam thoi chua gan @Roles(RoleEnum.SUPER_ADMIN).
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
      return { message: RESPONSE_MESSAGES.FACILITY_DELETED, data };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Update facility' })
  @ApiResponse({ status: 200, type: FacilityResponseDto })
  async deActivateFacility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    try {
      assertFacilityAccess(user, id);
      const data = await this.facilitiesService.deActivateFacility(id);
      return {
        message: RESPONSE_MESSAGES.FACILITY_STATUS_UPDATED,
        data: data,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  
}
