import { Body, Controller, Delete, Get, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/requests/create-facility.dto';
import { UpdateFacilityDto } from './dto/requests/update-facility.dto';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { FacilityResponseDto } from './dto/responds/facilities-respond';
import { HttpException } from '@nestjs/common';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
} from '../../common/helpers/facility-scope.helper';


@ApiTags('Public - Facilities')
@Controller('public/facilities')
export class PublicFacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List facilities' })
  async findAll(@Query() query: SearchFacilityDto) {
    return { message: RESPONSE_MESSAGES.SUCCESS, data: await this.service.findAll(query) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility details' })
    async findById(@Param('id') id: string) {
        return { message: RESPONSE_MESSAGES.SUCCESS, data: await this.service.findById(id) };
    }
}
