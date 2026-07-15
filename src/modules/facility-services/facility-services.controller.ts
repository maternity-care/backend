import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FACILITY_SERVICE_CONSTANT } from '../../common/constants/facility-service.constant';
import { CreateFacilityServiceDto } from './dto/requests/create-facility-service.dto';
import { SearchFacilityServiceDto } from './dto/requests/search-facility-service.dto';
import { UpdateFacilityServiceDto } from './dto/requests/update-facility-service.dto';
import { FacilityServicesService } from './facility-services.service';

@ApiTags('Management - Facility Services')
@Controller('management/facility-services')
export class FacilityServicesController {
  constructor(private readonly facilityServicesService: FacilityServicesService) {}

  // Lấy danh sách dịch vụ theo từng facility; dùng cho màn hình quản trị giá/thời lượng.
  @Get()
  @ApiOperation({ summary: 'List facility services' })
  async findAll(@Query() query: SearchFacilityServiceDto) {
    const data = query.page
      ? await this.facilityServicesService.findAllPaginated(query)
      : await this.facilityServicesService.findAll(query);
    return { message: FACILITY_SERVICE_CONSTANT.FOUND, data };
  }

  // Lấy chi tiết một mapping facility-service.
  @Get(':id')
  @ApiOperation({ summary: 'Get facility service details' })
  async findOne(@Param('id') id: string) {
    return {
      message: FACILITY_SERVICE_CONSTANT.DETAIL_FOUND,
      data: await this.facilityServicesService.findById(id),
    };
  }

  // Gán một service gốc cho facility với giá/thời lượng riêng tại facility đó.
  @Post()
  @ApiOperation({ summary: 'Assign a service to a facility' })
  async create(@Body() dto: CreateFacilityServiceDto) {
    return {
      message: FACILITY_SERVICE_CONSTANT.CREATED,
      data: await this.facilityServicesService.create(dto),
    };
  }

  // Cập nhật giá, thời lượng hoặc trạng thái available/unavailable của service tại facility.
  @Patch(':id')
  @ApiOperation({ summary: 'Update facility service' })
  async update(@Param('id') id: string, @Body() dto: UpdateFacilityServiceDto) {
    return {
      message: FACILITY_SERVICE_CONSTANT.UPDATED,
      data: await this.facilityServicesService.update(id, dto),
    };
  }

  // Xóa an toàn: nếu đã có appointment/extra-service thì chuyển unavailable.
  @Delete(':id')
  @ApiOperation({ summary: 'Delete facility service safely' })
  async remove(@Param('id') id: string) {
    return {
      message: FACILITY_SERVICE_CONSTANT.DELETED,
      data: await this.facilityServicesService.remove(id),
    };
  }
}
