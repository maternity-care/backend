import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { SearchFacilityDto } from './dto/requests/search-facility.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FacilityStatus } from '../../common/constants/status.enum';
import { FacilityPaginatedResponseDto } from './dto/responds/facilities-respond';


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
}
