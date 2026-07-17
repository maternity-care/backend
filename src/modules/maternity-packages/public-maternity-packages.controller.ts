import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { MaternityPackageStatus } from '../../common/constants/status.enum';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { MaternityPackagesService } from './maternity-packages.service';

@ApiTags('Public - Maternity Packages')
@Controller('public/maternity-packages')
export class PublicMaternityPackagesController {
  constructor(private readonly maternityPackagesService: MaternityPackagesService) {}

  // Public list chỉ hiện các gói active để guest/thai phụ xem và mua.
  @Get()
  @ApiOperation({ summary: 'List active maternity packages' })
  async findAll(@Query() query: SearchMaternityPackageDto) {
    query.status = MaternityPackageStatus.ACTIVE;
    const data = query.page
      ? await this.maternityPackagesService.findAllPaginated(query)
      : await this.maternityPackagesService.findAll(query);
    return { message: MATERNITY_PACKAGE_CONSTANT.FOUND, data };
  }

  // Public detail vẫn kiểm tra active để không lộ gói draft/inactive.
  @Get(':id')
  @ApiOperation({ summary: 'Get active maternity package details' })
  async findOne(@Param('id') id: string) {
    const pkg = await this.maternityPackagesService.findById(id);
    return {
      message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND,
      data: pkg.status === MaternityPackageStatus.ACTIVE ? pkg : null,
    };
  }
}
