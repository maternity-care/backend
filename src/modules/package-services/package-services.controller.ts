import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import { CreatePackageServiceDto } from './dto/requests/create-package-service.dto';
import { PackageServiceResponseDto } from './dto/responses/package-service-response.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { UpdatePackageServiceDto } from './dto/requests/update-package-service.dto';
import { PackageServicesService } from './package-services.service';

@ApiTags('Management - Package Services')
@Controller('management/package-services')
export class PackageServicesController {
  constructor(private readonly packageServicesService: PackageServicesService) {}

  // Danh sách service trong các gói; có thể filter theo packageId/serviceId.
  @Get()
  @ApiOperation({ summary: 'List package services' })
  @ApiResponse({ status: 200, type: [PackageServiceResponseDto] })
  async findAll(@Query() query: SearchPackageServiceDto) {
    const data = query.page
      ? await this.packageServicesService.findAllPaginated(query)
      : await this.packageServicesService.findAll(query);
    return { message: PACKAGE_SERVICE_CONSTANT.FOUND, data };
  }

  // Xem chi tiết một dòng service trong gói.
  @Get(':id')
  @ApiOperation({ summary: 'Get package service details' })
  @ApiResponse({ status: 200, type: PackageServiceResponseDto })
  async findOne(@Param('id') id: string) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.DETAIL_FOUND,
      data: await this.packageServicesService.findDetailsById(id),
    };
  }

  // Thêm service vào gói, ví dụ "Gói cơ bản gồm 2 lần siêu âm".
  @Post()
  @ApiOperation({ summary: 'Add service to package' })
  async create(@Body() dto: CreatePackageServiceDto) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.CREATED,
      data: await this.packageServicesService.create(dto),
    };
  }

  // Cập nhật số lượng, required/optional hoặc facility scope của service trong gói.
  @Patch(':id')
  @ApiOperation({ summary: 'Update package service' })
  async update(@Param('id') id: string, @Body() dto: UpdatePackageServiceDto) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.UPDATED,
      data: await this.packageServicesService.update(id, dto),
    };
  }

  // Xóa service khỏi gói nếu chưa phát sinh quyền lợi bệnh nhân.
  @Delete(':id')
  @ApiOperation({ summary: 'Delete package service safely' })
  async remove(@Param('id') id: string) {
    await this.packageServicesService.remove(id);
    return { message: PACKAGE_SERVICE_CONSTANT.DELETED, data: null };
  }
}
