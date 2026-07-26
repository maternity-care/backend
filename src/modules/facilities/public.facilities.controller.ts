import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FacilityStatus } from '../../common/constants/status.enum';
import { FacilityPaginatedResponseDto, FacilityResponseDto } from './dto/responds/facilities-respond';


@ApiTags('Public - Facilities')
@Controller('public/facilities')
export class PublicFacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List facilities' })
  @ApiResponse({ status: 200, type: FacilityPaginatedResponseDto })
  async findAll(@Query() query: SearchFacilityDto) {
    query.status = FacilityStatus.ACTIVE;
    return {
      message: RESPONSE_MESSAGES.FACILITIES.GET_LIST_SUCCESS,
      data: await this.service.findAllPaginated(query),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility details' })
  @ApiResponse({ status: 200, type: FacilityResponseDto })
  async findById(@Param('id') id: string) {
    const facility = await this.service.findDetailsById(id);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new NotFoundException(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
    return {
      message: RESPONSE_MESSAGES.FACILITIES.GET_SUCCESS,
      data: facility,
    };
  }
}
