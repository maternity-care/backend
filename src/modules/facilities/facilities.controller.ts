import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { FacilityResponseDto } from './dto/responds/facilities-respond';
import { HttpException } from '@nestjs/common';

@ApiTags('Management - Facilities')
@ApiBearerAuth()
//@UseGuards(JwtAuthGuard)
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
  async findAll(@Query() query: SearchFacilityDto) {
    try {
      const facilities = await this.facilitiesService.findAll(query);
      return {
        message: 'Lấy danh sách cơ sở thành công',
        data: facilities,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility details' })
  @ApiResponse({ status: 200, type: FacilityResponseDto })
  async findOne(@Param('id') id: string) {
    try {
      const facility = await this.facilitiesService.findById(id);
      return {
        message: 'Lấy thông tin cơ sở thành công',
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create facility' })
  @ApiResponse({ status: 201, type: FacilityResponseDto })
  async create(@Body() dto: CreateFacilityDto) {
    try {
      const facility = await this.facilitiesService.create(dto);
      return {
        message: 'Tạo cơ sở thành công',
        data: facility,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update facility' })
  @ApiResponse({ status: 200, type: FacilityResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    try {
      const data = await this.facilitiesService.update(id, dto);
      return {
        message: 'Cập nhật thông tin cơ sở thành công',
        data: data,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete facility' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    try {
      await this.facilitiesService.remove(id);
      return { message: 'Xoá cơ sở thành công', data: null };
    } catch (error) {
      this.handleError(error);
    }
  }

  
}
