import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { ServiceSaleMode } from './create-service.dto';
import { SERVICE_CONSTANT } from '../../../../common/constants/service.constant';

export class SearchServiceDto {
  @ApiPropertyOptional({ description: 'Tim theo id, code hoac name' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString({ message: SERVICE_CONSTANT.SEARCH_INVALID })
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID trong bảng service_types' })
  @IsOptional()
  @IsString({ message: SERVICE_CONSTANT.TYPE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: SERVICE_CONSTANT.TYPE_ID_INVALID })
  serviceTypeId?: string;

  @ApiPropertyOptional({ enum: ServiceSaleMode })
  @IsOptional()
  @IsEnum(ServiceSaleMode, { message: SERVICE_CONSTANT.SALE_MODE_INVALID })
  saleMode?: ServiceSaleMode;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus, { message: SERVICE_CONSTANT.STATUS_INVALID })
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: SERVICE_CONSTANT.PAGE_INVALID })
  @Min(1, { message: SERVICE_CONSTANT.PAGE_INVALID })
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: SERVICE_CONSTANT.LIMIT_INVALID })
  @Min(1, { message: SERVICE_CONSTANT.LIMIT_INVALID })
  @Max(200, { message: SERVICE_CONSTANT.LIMIT_INVALID })
  limit?: number;
}
