import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { UpdatePackageServiceDto } from './dto/requests/update-package-service.dto';
import { PackageServicesService } from './package-services.service';
import { MaternityPackagesService } from '../maternity-packages/maternity-packages.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  getActiveFacilityId,
  isSuperAdmin,
} from '../../common/helpers/facility-scope.helper';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';

@ApiTags('Management - Maternity Package Items')
@Controller('management/package-services')
export class PackageServicesController {
  constructor(
    private readonly packageServicesService: PackageServicesService,
    private readonly maternityPackagesService?: MaternityPackagesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List services inside maternity packages' })
  async findAll(
    @CurrentUser() userOrQuery: AuthenticatedUser | SearchPackageServiceDto | undefined,
    @Query() queryParam?: SearchPackageServiceDto,
  ) {
    const user = queryParam ? userOrQuery as AuthenticatedUser | undefined : undefined;
    const query = queryParam ?? userOrQuery as SearchPackageServiceDto ?? {};

    const activeFacilityId = getActiveFacilityId(user);
    if (activeFacilityId) {
      query.facilityId = activeFacilityId;
    }

    if (user && query.packageId) {
      await this.assertPackageAccess(user, query.packageId);
    }

    const data = query.page
      ? await this.packageServicesService.findAllPaginated(query)
      : await this.packageServicesService.findAll(query);
    return { message: PACKAGE_SERVICE_CONSTANT.FOUND, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package service item details' })
  async findOne(
    @CurrentUser() userOrId: AuthenticatedUser | string | undefined,
    @Param('id') idParam?: string,
  ) {
    const user = idParam ? userOrId as AuthenticatedUser | undefined : undefined;
    const id = idParam ?? String(userOrId);

    const data = await this.packageServicesService.findDetailsById(id);
    if (user) {
      await this.assertPackageAccess(user, data.packageId);
    }

    return {
      message: PACKAGE_SERVICE_CONSTANT.DETAIL_FOUND,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update package service item' })
  async update(
    @CurrentUser() userOrId: AuthenticatedUser | string | undefined,
    @Param('id') idOrDto?: string | UpdatePackageServiceDto,
    @Body() dtoParam?: UpdatePackageServiceDto,
  ) {
    const user = dtoParam ? userOrId as AuthenticatedUser | undefined : undefined;
    const id = dtoParam ? String(idOrDto) : String(userOrId);
    const dto = dtoParam ?? idOrDto as UpdatePackageServiceDto;

    this.assertFacilityAdminMutation(user);
    if (user) {
      const current = await this.packageServicesService.findDetailsById(id);
      await this.assertPackageAccess(user, current.packageId);
      if (dto.packageId) {
        await this.assertPackageAccess(user, dto.packageId);
      }
    }

    return {
      message: PACKAGE_SERVICE_CONSTANT.UPDATED,
      data: await this.packageServicesService.update(id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove package service item safely' })
  async remove(
    @CurrentUser() userOrId: AuthenticatedUser | string | undefined,
    @Param('id') idParam?: string,
  ) {
    const user = idParam ? userOrId as AuthenticatedUser | undefined : undefined;
    const id = idParam ?? String(userOrId);

    this.assertFacilityAdminMutation(user);
    if (user) {
      const current = await this.packageServicesService.findDetailsById(id);
      await this.assertPackageAccess(user, current.packageId);
    }

    return {
      message: PACKAGE_SERVICE_CONSTANT.DELETED,
      data: await this.packageServicesService.remove(id).then(() => null),
    };
  }

  private async assertPackageAccess(user: AuthenticatedUser, packageId: string): Promise<void> {
    if (!this.maternityPackagesService) {
      return;
    }
    const pkg = await this.maternityPackagesService.findById(packageId);
    assertFacilityAccess(user, pkg.facilityId);
  }

  private assertFacilityAdminMutation(user?: AuthenticatedUser): void {
    if (user && isSuperAdmin(user)) {
      throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_ASSIGNMENT_INVALID);
    }
  }
}
