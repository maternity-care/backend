import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { PackageServiceFacilityScope } from './create-package-service.dto';

export class SearchPackageServiceDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  packageId?: string;

  @ApiPropertyOptional({ example: '2' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityServiceId?: string;

  @ApiPropertyOptional({ example: '1', description: 'Lọc theo cơ sở sở hữu gói' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId?: string;

  @ApiPropertyOptional({ example: '3', description: 'Lọc theo ID trong bảng service_types' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceTypeId?: string;

  @ApiPropertyOptional({ enum: PackageServiceFacilityScope })
  @IsOptional()
  @IsEnum(PackageServiceFacilityScope)
  allowedFacilityScope?: PackageServiceFacilityScope;

  @ApiPropertyOptional({ description: 'Tìm theo code/name/description của service hoặc gói' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
