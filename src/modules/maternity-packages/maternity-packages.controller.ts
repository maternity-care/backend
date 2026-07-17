import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { CreateMaternityPackageDto } from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { UpdateMaternityPackageDto } from './dto/requests/update-maternity-package.dto';
import { MaternityPackagesService } from './maternity-packages.service';

@ApiTags('Management - Maternity Packages')
@Controller('management/maternity-packages')
export class MaternityPackagesController {
  constructor(private readonly maternityPackagesService: MaternityPackagesService) {}

  // Lấy danh sách gói dịch vụ cho quản trị; có page thì trả phân trang.
  @Get()
  @ApiOperation({ summary: 'List maternity packages' })
  async findAll(@Query() query: SearchMaternityPackageDto) {
    const data = query.page
      ? await this.maternityPackagesService.findAllPaginated(query)
      : await this.maternityPackagesService.findAll(query);
    return { message: MATERNITY_PACKAGE_CONSTANT.FOUND, data };
  }

  // Lấy chi tiết một gói dịch vụ.
  @Get(':id')
  @ApiOperation({ summary: 'Get maternity package details' })
  async findOne(@Param('id') id: string) {
    return {
      message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND,
      data: await this.maternityPackagesService.findById(id),
    };
  }

  // Tạo gói dịch vụ. Đây mới là "vỏ gói"; service con sẽ gắn ở package-services.
  @Post()
  @ApiOperation({ summary: 'Create maternity package' })
  async create(@Body() dto: CreateMaternityPackageDto) {
    return {
      message: MATERNITY_PACKAGE_CONSTANT.CREATED,
      data: await this.maternityPackagesService.create(dto),
    };
  }

  // Cập nhật tên, giá final, thời hạn, độ ưu tiên hoặc trạng thái của gói.
  @Patch(':id')
  @ApiOperation({ summary: 'Update maternity package' })
  async update(@Param('id') id: string, @Body() dto: UpdateMaternityPackageDto) {
    return {
      message: MATERNITY_PACKAGE_CONSTANT.UPDATED,
      data: await this.maternityPackagesService.update(id, dto),
    };
  }

  // Xóa an toàn: nếu gói đã có service con hoặc bệnh nhân mua thì chuyển inactive.
  @Delete(':id')
  @ApiOperation({ summary: 'Delete maternity package safely' })
  async remove(@Param('id') id: string) {
    return {
      message: MATERNITY_PACKAGE_CONSTANT.DELETED,
      data: await this.maternityPackagesService.remove(id),
    };
  }
}
