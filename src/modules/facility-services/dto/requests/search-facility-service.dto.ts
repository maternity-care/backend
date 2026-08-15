import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { FACILITY_SERVICE_CONSTANT } from '../../../../common/constants/facility-service.constant';

export class SearchFacilityServiceDto {
  @ApiPropertyOptional({ description: 'Tìm theo code/name/description của service gốc' })
  @IsOptional()
  @IsString({ message: FACILITY_SERVICE_CONSTANT.SEARCH_INVALID })
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: FACILITY_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: FACILITY_SERVICE_CONSTANT.SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.SERVICE_ID_INVALID })
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID trong bảng service_types' })
  @IsOptional()
  @IsString({ message: FACILITY_SERVICE_CONSTANT.SERVICE_TYPE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.SERVICE_TYPE_ID_INVALID })
  serviceTypeId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus, { message: FACILITY_SERVICE_CONSTANT.STATUS_INVALID })
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: FACILITY_SERVICE_CONSTANT.PAGE_INVALID })
  @Min(1, { message: FACILITY_SERVICE_CONSTANT.PAGE_INVALID })
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: FACILITY_SERVICE_CONSTANT.LIMIT_INVALID })
  @Min(1, { message: FACILITY_SERVICE_CONSTANT.LIMIT_INVALID })
  @Max(200, { message: FACILITY_SERVICE_CONSTANT.LIMIT_INVALID })
  limit?: number;
}
