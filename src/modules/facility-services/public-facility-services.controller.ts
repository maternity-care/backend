import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SearchFacilityServiceDto } from './dto/requests/search-facility-service.dto';
import { FacilityServicesService } from './facility-services.service';

@ApiTags('Public - Facility Services')
@Controller('public/facilities/:facilityId/services')
export class PublicFacilityServicesController {
  constructor(private readonly facilityServicesService: FacilityServicesService) {}

  // API public cho guest/thai phụ xem các dịch vụ đang được cơ sở cung cấp.
  @Get()
  @ApiOperation({ summary: 'List public services of a facility' })
  async findServicesByFacility(
    @Param('facilityId') facilityId: string,
    @Query() query: SearchFacilityServiceDto,
  ) {
    return {
      message: RESPONSE_MESSAGES.SUCCESS,
      data: await this.facilityServicesService.findPublicByFacilityId(facilityId, query),
    };
  }
}
