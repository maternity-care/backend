import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { CreateServiceDto } from './dto/requests/create-service.dto';
import { SearchServiceDto } from './dto/requests/search-service.dto';
import { UpdateServiceDto } from './dto/requests/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Management - Services')
@Controller('management/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Lấy danh sách dịch vụ; nếu có page thì trả dạng phân trang, không có page thì trả mảng thường.
  @Get()
  @ApiOperation({ summary: 'List services' })
  async findAll(@Query() query: SearchServiceDto) {
    const data = query.page
      ? await this.servicesService.findAllPaginated(query)
      : await this.servicesService.findAll(query);
    return { message: SERVICE_CONSTANT.FOUND, data };
  }

  // Lấy chi tiết một dịch vụ theo id, dùng cho màn hình xem/sửa.
  @Get(':id')
  @ApiOperation({ summary: 'Get service details' })
  async findOne(@Param('id') id: string) {
    return {
      message: SERVICE_CONSTANT.DETAIL_FOUND,
      data: await this.servicesService.findById(id),
    };
  }

  // Tạo dịch vụ gốc với giá tham khảo và thời lượng mặc định.
  @Post()
  @ApiOperation({ summary: 'Create service' })
  async create(@Body() dto: CreateServiceDto) {
    return {
      message: SERVICE_CONSTANT.CREATED,
      data: await this.servicesService.create(dto),
    };
  }

  // Cập nhật thông tin dịch vụ, ví dụ giá gốc, thời lượng, trạng thái.
  @Patch(':id')
  @ApiOperation({ summary: 'Update service' })
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return {
      message: SERVICE_CONSTANT.UPDATED,
      data: await this.servicesService.update(id, dto),
    };
  }

  // Xóa an toàn: nếu dịch vụ đã được dùng thì chuyển inactive thay vì xóa khỏi DB.
  @Delete(':id')
  @ApiOperation({ summary: 'Delete service safely' })
  async remove(@Param('id') id: string) {
    return {
      message: SERVICE_CONSTANT.DELETED,
      data: await this.servicesService.remove(id),
    };
  }
}
