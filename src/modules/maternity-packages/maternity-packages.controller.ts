import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { CreateMaternityPackageDto } from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { UpdateMaternityPackageDto } from './dto/requests/update-maternity-package.dto';
import { MaternityPackagesService } from './maternity-packages.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
  isSuperAdmin,
} from '../../common/helpers/facility-scope.helper';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';

@ApiTags('Management - Maternity Package Catalog')
@Controller('management/maternity-packages')
export class MaternityPackagesController {
  constructor(private readonly maternityPackagesService: MaternityPackagesService) {}

  // Lấy danh sách gói dịch vụ cho quản trị; có page thì trả phân trang.
  @Get()
  @ApiOperation({ summary: 'List maternity packages' })
  async findAll(
    @CurrentUser() userOrQuery: AuthenticatedUser | SearchMaternityPackageDto | undefined,
    @Query() queryParam?: SearchMaternityPackageDto,
  ) {
    const user = queryParam ? userOrQuery as AuthenticatedUser | undefined : undefined;
    const query = queryParam ?? userOrQuery as SearchMaternityPackageDto ?? {};

    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) {
      query.facilityId = activeFacilityId;
    }

    const data = query.page
      ? await this.maternityPackagesService.findAllPaginated(query)
      : await this.maternityPackagesService.findAll(query);
    return { message: MATERNITY_PACKAGE_CONSTANT.FOUND, data };
  }

  // Lấy chi tiết một gói dịch vụ.
  @Get(':id')
  @ApiOperation({ summary: 'Get maternity package details' })
  async findOne(
    @CurrentUser() userOrId: AuthenticatedUser | string | undefined,
    @Param('id') idParam?: string,
  ) {
    const user = idParam ? userOrId as AuthenticatedUser | undefined : undefined;
    const id = idParam ?? String(userOrId);

    const data = await this.maternityPackagesService.findDetailsById(id);
    if (user) {
      assertFacilityAccess(user, data.facilityId);
    }

    return {
      message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND,
      data,
    };
  }

  // Tạo gói dịch vụ. Đây mới là "vỏ gói"; service con sẽ gắn ở package-services.
  @Post()
  @ApiOperation({ summary: 'Create maternity package with services' })
  async create(
    @CurrentUser() userOrDto: AuthenticatedUser | CreateMaternityPackageDto | undefined,
    @Body() dtoParam?: CreateMaternityPackageDto,
  ) {
    const user = dtoParam ? userOrDto as AuthenticatedUser | undefined : undefined;
    const dto = dtoParam ?? userOrDto as CreateMaternityPackageDto;

    if (user && isSuperAdmin(user)) {
      throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_ASSIGNMENT_INVALID);
    }

    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) {
      dto.facilityId = activeFacilityId;
    }

    return {
      message: MATERNITY_PACKAGE_CONSTANT.CREATED,
      data: await this.maternityPackagesService.create(dto),
    };
  }

  // Cập nhật tên, giá final, thời hạn, độ ưu tiên hoặc trạng thái của gói.
  @Patch(':id')
  @ApiOperation({ summary: 'Update maternity package' })
  async update(
    @CurrentUser() userOrId: AuthenticatedUser | string | undefined,
    @Param('id') idOrDto?: string | UpdateMaternityPackageDto,
    @Body() dtoParam?: UpdateMaternityPackageDto,
  ) {
    const user = dtoParam ? userOrId as AuthenticatedUser | undefined : undefined;
    const id = dtoParam ? String(idOrDto) : String(userOrId);
    const dto = dtoParam ?? idOrDto as UpdateMaternityPackageDto;

    if (user && isSuperAdmin(user)) {
      throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_ASSIGNMENT_INVALID);
    }

    if (user) {
      const current = await this.maternityPackagesService.findDetailsById(id);
      assertFacilityAccess(user, current.facilityId);

      const activeFacilityId = getActiveFacilityId(user);
      if (activeFacilityId) {
        dto.facilityId = activeFacilityId;
      }
    }

    return {
      message: MATERNITY_PACKAGE_CONSTANT.UPDATED,
      data: await this.maternityPackagesService.update(id, dto),
    };
  }

  // Xóa an toàn: nếu gói đã có service con hoặc bệnh nhân mua thì chuyển inactive.
  @Delete(':id')
  @ApiOperation({ summary: 'Delete maternity package safely' })
  async remove(
    @CurrentUser() userOrId: AuthenticatedUser | string | undefined,
    @Param('id') idParam?: string,
  ) {
    const user = idParam ? userOrId as AuthenticatedUser | undefined : undefined;
    const id = idParam ?? String(userOrId);

    if (user && isSuperAdmin(user)) {
      throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_ASSIGNMENT_INVALID);
    }

    if (user) {
      const current = await this.maternityPackagesService.findDetailsById(id);
      assertFacilityAccess(user, current.facilityId);
    }

    return {
      message: MATERNITY_PACKAGE_CONSTANT.DELETED,
      data: await this.maternityPackagesService.remove(id),
    };
  }
}
