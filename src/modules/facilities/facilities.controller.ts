import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { FacilityResponseDto } from './dto/responds/facilities-respond';
import { HttpException } from '@nestjs/common';
import { FACILITY_CONSTANT } from '../../common/constants/facility.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
} from '../../common/helpers/facility-scope.helper';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/constants/role.enum';
@ApiTags('Management - Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
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
        const facility = await this.facilitiesService.findById(activeFacilityId);
        return {
          message: FACILITY_CONSTANT.FACILITY_FOUND,
          data: query?.page
            ? { items: [facility], total: 1, page: Number(query.page), limit: 1 }
            : [facility],
        };
      }

      // nếu client gửi page => trả về kết quả phân trang
      if (query?.page) {
        const paged = await this.facilitiesService.findAllPaginated(query);
        return {
          message: FACILITY_CONSTANT.FACILITY_FOUND,
          data: paged,
        };
      }

      const facilities = await this.facilitiesService.findAll(query);
      return {
        message: FACILITY_CONSTANT.FACILITY_FOUND,
        data: facilities,
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
      const facility = await this.facilitiesService.findById(id);
      return {
        message: FACILITY_CONSTANT.FACILITY_DETAIL_FOUND,
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post()
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create facility' })
  @ApiResponse({ status: 201, type: FacilityResponseDto })
  async create(@Body() dto: CreateFacilityDto) {
    try {
      const facility = await this.facilitiesService.create(dto);
      return {
        message: FACILITY_CONSTANT.CREATED_SUCCESSFULLY,
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
        message: FACILITY_CONSTANT.UPDATED_SUCCESSFULLY,
        data: data,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':id')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete facility' })
  @ApiResponse({ status: 200 })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    try {
      assertFacilityAccess(user, id);
      await this.facilitiesService.remove(id);
      return { message: FACILITY_CONSTANT.DELETED_SUCCESSFULLY, data: null };
    } catch (error) {
      this.handleError(error);
    }
  }

  
}
