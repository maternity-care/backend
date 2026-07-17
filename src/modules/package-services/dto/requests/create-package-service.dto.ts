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
} from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export enum PackageServiceFacilityScope {
  ALL = 'all',
  SELECTED = 'selected',
}

function parseBooleanInput(value: unknown): unknown {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return value;
}

export class CreatePackageServiceDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  packageId: string;

  @ApiProperty({ example: '3' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  includedQuantity: number;

  @ApiProperty({ example: true })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ example: false })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean()
  isOptional: boolean;

  @ApiProperty({ enum: PackageServiceFacilityScope, example: PackageServiceFacilityScope.ALL })
  @IsEnum(PackageServiceFacilityScope)
  allowedFacilityScope: PackageServiceFacilityScope;

  @ApiPropertyOptional({ example: ['1', '2'], description: 'Bắt buộc khi allowedFacilityScope = selected' })
  @ValidateIf((dto: CreatePackageServiceDto) => dto.allowedFacilityScope === PackageServiceFacilityScope.SELECTED)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(POSITIVE_ID_PATTERN, { each: true })
  facilityIds?: string[];
}
