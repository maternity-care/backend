import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import { PackageServiceResponseDto } from './dto/responses/package-service-response.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { PackageServicesService } from './package-services.service';

@ApiTags('Public - Package Services')
@Controller('public/maternity-packages/:packageId/services')
export class PublicPackageServicesController {
  constructor(private readonly packageServicesService: PackageServicesService) {}

  // Public endpoint để xem một gói gồm những dịch vụ nào và mỗi dịch vụ được dùng mấy lần.
  @Get()
  @ApiOperation({ summary: 'List services included in a maternity package' })
  @ApiResponse({ status: 200, type: [PackageServiceResponseDto] })
  async findByPackage(
    @Param('packageId') packageId: string,
    @Query() query: SearchPackageServiceDto,
  ) {
    return {
      message: PACKAGE_SERVICE_CONSTANT.FOUND,
      data: await this.packageServicesService.findDetailsByPackageId(packageId, query),
    };
  }
}
