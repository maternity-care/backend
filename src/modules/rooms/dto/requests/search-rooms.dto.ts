import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from './create-room.dto';

export class SearchRoomsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(50)
  floor?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'facilityId phải là số nguyên dương' })
  facilityId?: string;
}

