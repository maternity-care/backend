import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { AvailabilityStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { ServiceType } from '../../../services/dto/requests/create-service.dto';

export class SearchFacilityServiceDto {
  @ApiPropertyOptional({ description: 'Tìm theo code/name/description của service gốc' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceId?: string;

  @ApiPropertyOptional({ enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ enum: AvailabilityStatus })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  status?: AvailabilityStatus;

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
