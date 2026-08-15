import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { PACKAGE_SERVICE_CONSTANT } from '../../../../common/constants/package-service.constant';

export enum PackageServiceFacilityScope {
  ALL = 'all',
  SELECTED = 'selected',
}

function parseBooleanInput(value: unknown): unknown {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return value;
}

export class PackageServiceItemInputDto {
  @ApiProperty({ example: '3' })
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.FACILITY_SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.FACILITY_SERVICE_ID_INVALID })
  facilityServiceId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: PACKAGE_SERVICE_CONSTANT.INCLUDED_QUANTITY_INVALID })
  @Min(1, { message: PACKAGE_SERVICE_CONSTANT.INCLUDED_QUANTITY_INVALID })
  @Max(100, { message: PACKAGE_SERVICE_CONSTANT.INCLUDED_QUANTITY_INVALID })
  includedQuantity: number;

  @ApiProperty({ example: true })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean({ message: PACKAGE_SERVICE_CONSTANT.CLASSIFICATION_INVALID })
  isRequired: boolean;

  @ApiProperty({ example: false })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean({ message: PACKAGE_SERVICE_CONSTANT.CLASSIFICATION_INVALID })
  isOptional: boolean;

  @ApiProperty({ enum: PackageServiceFacilityScope, example: PackageServiceFacilityScope.ALL })
  @IsOptional()
  @IsEnum(PackageServiceFacilityScope, { message: PACKAGE_SERVICE_CONSTANT.FACILITY_SCOPE_INVALID })
  allowedFacilityScope: PackageServiceFacilityScope = PackageServiceFacilityScope.ALL;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 1000,
    description: 'Thứ tự hiển thị dịch vụ trong gói; số nhỏ đứng trước',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: PACKAGE_SERVICE_CONSTANT.SORT_ORDER_INVALID })
  @Min(0, { message: PACKAGE_SERVICE_CONSTANT.SORT_ORDER_INVALID })
  @Max(1000, { message: PACKAGE_SERVICE_CONSTANT.SORT_ORDER_INVALID })
  sortOrder?: number;

  @ApiPropertyOptional({
    example: ['1', '2'],
    description: 'Bắt buộc khi allowedFacilityScope = selected',
  })
  @ValidateIf(
    (dto: PackageServiceItemInputDto) =>
      dto.allowedFacilityScope === PackageServiceFacilityScope.SELECTED,
  )
  @IsArray({ message: PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED })
  @ArrayNotEmpty({ message: PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED })
  @ArrayUnique({ message: PACKAGE_SERVICE_CONSTANT.SELECTED_FACILITIES_REQUIRED })
  @IsString({ each: true, message: PACKAGE_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { each: true, message: PACKAGE_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  facilityIds?: string[];
}

export class CreatePackageServiceDto extends PackageServiceItemInputDto {
  @ApiProperty({ example: '1' })
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.PACKAGE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.PACKAGE_ID_INVALID })
  packageId: string;
}

export class BulkCreatePackageServicesDto {
  @ApiProperty({ example: '1' })
  @IsString({ message: PACKAGE_SERVICE_CONSTANT.PACKAGE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: PACKAGE_SERVICE_CONSTANT.PACKAGE_ID_INVALID })
  packageId: string;

  @ApiProperty({ type: [PackageServiceItemInputDto], minItems: 1, maxItems: 100 })
  @IsArray({ message: PACKAGE_SERVICE_CONSTANT.SERVICES_REQUIRED })
  @ArrayNotEmpty({ message: PACKAGE_SERVICE_CONSTANT.SERVICES_REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => PackageServiceItemInputDto)
  services: PackageServiceItemInputDto[];
}
