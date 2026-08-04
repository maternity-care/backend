import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { ServiceSaleMode } from './create-service.dto';

export class SearchServiceDto {
  @ApiPropertyOptional({ description: 'Tim theo id, code hoac name' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID trong bảng service_types' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceTypeId?: string;

  @ApiPropertyOptional({ enum: ServiceSaleMode })
  @IsOptional()
  @IsEnum(ServiceSaleMode)
  saleMode?: ServiceSaleMode;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
