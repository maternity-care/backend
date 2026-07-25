import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';


@ApiTags('Public - Facilities')
@Controller('public/facilities')
export class PublicFacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List facilities' })
  async findAll(@Query() query: SearchFacilityDto) {
    return { message: RESPONSE_MESSAGES.FACILITIES.GET_LIST_SUCCESS, data: await this.service.findAll(query) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility details' })
    async findById(@Param('id') id: string) {
        return { message: RESPONSE_MESSAGES.FACILITIES.GET_SUCCESS, data: await this.service.findDetailsById(id) };
    }
}
