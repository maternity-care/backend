import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { PackageServiceFacilityScope } from './create-package-service.dto';
import { PACKAGE_SERVICE_CONSTANT } from '../../../../common/constants/package-service.constant';

export class SearchPackageServiceDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.PACKAGE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.PACKAGE_ID_INVALID })
  packageId?: string;

  @ApiPropertyOptional({ example: '2' })
  @IsOptional()
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.FACILITY_SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.FACILITY_SERVICE_ID_INVALID })
  facilityServiceId?: string;

  @ApiPropertyOptional({ example: '1', description: 'Lọc theo cơ sở sở hữu gói' })
  @IsOptional()
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  facilityId?: string;

  @ApiPropertyOptional({ example: '3', description: 'Lọc theo ID trong bảng service_types' })
  @IsOptional()
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.SERVICE_TYPE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.SERVICE_TYPE_ID_INVALID })
  serviceTypeId?: string;

  @ApiPropertyOptional({ enum: PackageServiceFacilityScope })
  @IsOptional()
  @IsEnum(PackageServiceFacilityScope, { message: PACKAGE_SERVICE_CONSTANT.FACILITY_SCOPE_INVALID })
  allowedFacilityScope?: PackageServiceFacilityScope;

  @ApiPropertyOptional({ description: 'Tìm theo code/name/description của service hoặc gói' })
  @IsOptional()
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.SEARCH_INVALID })
  search?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: PACKAGE_SERVICE_CONSTANT.PAGE_INVALID })
  @Min(1, { message: PACKAGE_SERVICE_CONSTANT.PAGE_INVALID })
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: PACKAGE_SERVICE_CONSTANT.LIMIT_INVALID })
  @Min(1, { message: PACKAGE_SERVICE_CONSTANT.LIMIT_INVALID })
  @Max(200, { message: PACKAGE_SERVICE_CONSTANT.LIMIT_INVALID })
  limit?: number;
}
