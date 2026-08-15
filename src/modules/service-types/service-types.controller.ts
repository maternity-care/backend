import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceTypeDto } from './dto/requests/create-service-type.dto';
import { SearchServiceTypesDto } from './dto/requests/search-service-types.dto';
import { UpdateServiceTypeDto } from './dto/requests/update-service-type.dto';
import {
  ServiceTypeLookupResponseDto,
  ServiceTypePaginatedResponseDto,
  ServiceTypeResponseDto,
} from './dto/responses/service-type-response.dto';
import { ServiceTypesService } from './service-types.service';

@ApiTags('Management - Service Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management/service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypesService: ServiceTypesService) {}

  @Get('lookup')
  @Permissions(PermissionEnum.SERVICE_VIEW)
  @ApiOperation({ summary: 'Lookup service types for service form select/autocomplete' })
  @ApiResponse({ status: 200, type: [ServiceTypeLookupResponseDto] })
  async lookup(@Query() query: SearchServiceTypesDto) {
    return {
      message: SERVICE_CONSTANT.TYPE_LOOKUP_FOUND,
      data: await this.serviceTypesService.findAll(query),
    };
  }

  @Get()
  @Permissions(PermissionEnum.SERVICE_VIEW)
  @ApiOperation({ summary: 'List service types' })
  @ApiResponse({ status: 200, type: ServiceTypePaginatedResponseDto })
  async findAll(@Query() query: SearchServiceTypesDto) {
    return {
      message: SERVICE_CONSTANT.TYPE_FOUND,
      data: await this.serviceTypesService.findAllPaginated(query),
    };
  }

  @Get(':id')
  @Permissions(PermissionEnum.SERVICE_VIEW)
  @ApiOperation({ summary: 'Get service type details' })
  @ApiResponse({ status: 200, type: ServiceTypeResponseDto })
  async findOne(@Param('id') id: string) {
    return {
      message: SERVICE_CONSTANT.TYPE_DETAIL_FOUND,
      data: await this.serviceTypesService.findById(id),
    };
  }

  @Post()
  @Permissions(PermissionEnum.SERVICE_CREATE)
  @ApiOperation({ summary: 'Create service type' })
  @ApiResponse({ status: 201, type: ServiceTypeResponseDto })
  async create(@Body() dto: CreateServiceTypeDto) {
    return {
      message: SERVICE_CONSTANT.TYPE_CREATED,
      data: await this.serviceTypesService.create(dto),
    };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.SERVICE_UPDATE)
  @ApiOperation({ summary: 'Update service type' })
  @ApiResponse({ status: 200, type: ServiceTypeResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateServiceTypeDto) {
    return {
      message: SERVICE_CONSTANT.TYPE_UPDATED,
      data: await this.serviceTypesService.update(id, dto),
    };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.SERVICE_DELETE)
  @ApiOperation({ summary: 'Delete service type when unused, otherwise deactivate it' })
  async remove(@Param('id') id: string) {
    return {
      message: SERVICE_CONSTANT.TYPE_DELETED,
      data: await this.serviceTypesService.remove(id),
    };
  }
}
