import { OrderStatus } from './../../../../common/constants/status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, Max, Min } from 'class-validator';

export class UserSearchOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  pregnancyProfileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum([OrderStatus])
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortTotalAmount?: 'ASC' | 'DESC';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortFacility?: 'ASC' | 'DESC';

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
