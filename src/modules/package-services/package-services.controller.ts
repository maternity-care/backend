import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import { CreatePackageServiceDto } from './dto/requests/create-package-service.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { UpdatePackageServiceDto } from './dto/requests/update-package-service.dto';
import { PackageServicesService } from './package-services.service';

@ApiTags('Management - Package Services')
@Controller('management/package-services')
export class PackageServicesController {
  constructor(private readonly packageServicesService: PackageServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List services inside maternity packages' })
  async findAll(@Query() query: SearchPackageServiceDto) {
    const data = query.page
      ? await this.packageServicesService.findAllPaginated(query)
      : await this.packageServicesService.findAll(query);
    return { message: PACKAGE_SERVICE_CONSTANT.FOUND, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package service item details' })
  async findOne(@Param('id') id: string) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.DETAIL_FOUND,
      data: await this.packageServicesService.findDetailsById(id),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Add facility service to a maternity package' })
  async create(@Body() dto: CreatePackageServiceDto) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.CREATED,
      data: await this.packageServicesService.create(dto),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update package service item' })
  async update(@Param('id') id: string, @Body() dto: UpdatePackageServiceDto) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.UPDATED,
      data: await this.packageServicesService.update(id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove package service item safely' })
  async remove(@Param('id') id: string) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.DELETED,
      data: await this.packageServicesService.remove(id).then(() => null),
    };
  }
}
