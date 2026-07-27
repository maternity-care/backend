import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { ServiceSaleMode } from './create-service.dto';

export class SearchServiceDto {
  @ApiPropertyOptional({ description: 'Tìm theo code, name hoặc description' })
  @IsOptional()
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

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
