import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { FACILITY_SERVICE_CONSTANT } from '../../common/constants/facility-service.constant';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  FacilityServicePaginatedResponseDto,
  FacilityServiceResponseDto,
} from './dto/responses/facility-service-response.dto';
import { SearchFacilityServiceDto } from './dto/requests/search-facility-service.dto';
import { UpdateFacilityServiceDto } from './dto/requests/update-facility-service.dto';
import { FacilityServicesService } from './facility-services.service';
import {
  BulkCreateFacilityServicesDto,
  CreateFacilityServiceDto,
} from './dto/requests/create-facility-service.dto';

@ApiTags('Management - Facility Service Settings')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/facility-services')
export class FacilityServicesController {
  constructor(private readonly facilityServicesService: FacilityServicesService) {}

  // Lấy danh sách dịch vụ theo từng facility; dùng cho màn hình quản trị giá/thời lượng.
  @Get()
  // @Permissions(PermissionEnum.SERVICE_VIEW)
  @ApiOperation({ summary: 'List facility services' })
  @ApiResponse({ status: 200, type: FacilityServicePaginatedResponseDto })
  async findAll(@Query() query: SearchFacilityServiceDto) {
    const data = query.page
      ? await this.facilityServicesService.findAllPaginated(query)
      : await this.facilityServicesService.findAll(query);
    return { message: FACILITY_SERVICE_CONSTANT.FOUND, data };
  }

  // Lấy chi tiết một mapping facility-service.
  @Get(':id')
  // @Permissions(PermissionEnum.SERVICE_VIEW)
  @ApiOperation({ summary: 'Get facility service details' })
  @ApiResponse({ status: 200, type: FacilityServiceResponseDto })
  async findOne(@Param('id') id: string) {
    return {
      message: FACILITY_SERVICE_CONSTANT.DETAIL_FOUND,
      data: await this.facilityServicesService.findDetailsById(id),
    };
  }

  // Gán một service gốc cho facility với giá/thời lượng riêng tại facility đó.
  // Cập nhật giá, thời lượng hoặc trạng thái available/unavailable của service tại facility.
  @Post()
  // @Permissions(PermissionEnum.SERVICE_UPDATE)
  @ApiOperation({ summary: 'Assign a service to a facility' })
  async create(@Body() dto: CreateFacilityServiceDto) {
    return {
      message: FACILITY_SERVICE_CONSTANT.CREATED,
      data: await this.facilityServicesService.create(dto),
    };
  }

  @Post('bulk')
  // @Permissions(PermissionEnum.SERVICE_UPDATE)
  @ApiOperation({ summary: 'Bulk assign services to a facility' })
  async bulkCreate(@Body() dto: BulkCreateFacilityServicesDto) {
    return {
      message: FACILITY_SERVICE_CONSTANT.BULK_CREATED,
      data: await this.facilityServicesService.bulkCreate(dto),
    };
  }

  @Patch(':id')
  // @Permissions(PermissionEnum.SERVICE_UPDATE)
  @ApiOperation({ summary: 'Update facility service' })
  async update(@Param('id') id: string, @Body() dto: UpdateFacilityServiceDto) {
    return {
      message: FACILITY_SERVICE_CONSTANT.UPDATED,
      data: await this.facilityServicesService.update(id, dto),
    };
  }

  // Xóa an toàn: nếu đã có appointment/extra-service thì chuyển unavailable.
  @Delete(':id')
  // @Permissions(PermissionEnum.SERVICE_DELETE)
  @ApiOperation({ summary: 'Delete facility service safely' })
  async remove(@Param('id') id: string) {
    return {
      message: FACILITY_SERVICE_CONSTANT.DELETED,
      data: await this.facilityServicesService.remove(id),
    };
  }
}
