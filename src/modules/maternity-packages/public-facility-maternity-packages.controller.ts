import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { AvailableMaternityPackageResponseDto } from './dto/responses/available-maternity-package-response.dto';
import { MaternityPackagesService } from './maternity-packages.service';

@ApiTags('Public - Facility Maternity Packages')
@Controller('public/facilities/:facilityId/maternity-packages')
export class PublicFacilityMaternityPackagesController {
  constructor(private readonly maternityPackagesService: MaternityPackagesService) {}

  // FE dùng API này sau khi thai phụ chọn cơ sở.
  // Chỉ trả các gói active mà mọi service con đều đang được cơ sở đó cung cấp ở trạng thái available.
  @Get()
  @ApiOperation({ summary: 'List maternity packages available at a facility' })
  @ApiResponse({ status: 200, type: [AvailableMaternityPackageResponseDto] })
  async findAvailablePackagesByFacility(
    @Param('facilityId') facilityId: string,
    @Query() query: SearchMaternityPackageDto,
  ) {
    const data = query.page
      ? await this.maternityPackagesService.findAvailableByFacilityIdPaginated(facilityId, query)
      : await this.maternityPackagesService.findAvailableByFacilityId(facilityId, query);

    return {
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data,
    };
  }
}
