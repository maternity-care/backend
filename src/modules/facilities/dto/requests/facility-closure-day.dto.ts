import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { trimText, trimValue } from '../../../../common/helpers/dto-transform.helper';

export const FACILITY_CLOSURE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateFacilityClosureDayDto {
  @ApiProperty({ example: '2026-09-02', description: 'Ngay co so dong cua, dinh dang YYYY-MM-DD' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @IsNotEmpty()
  @Matches(FACILITY_CLOSURE_DATE_PATTERN, { message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.DATE_FORMAT_INVALID })
  closureDate: string;

  @ApiPropertyOptional({ example: 'Nghi le Quoc khanh' })
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

export class UpdateFacilityClosureDayDto {
  @ApiPropertyOptional({ example: '2026-09-02', description: 'Ngay co so dong cua, dinh dang YYYY-MM-DD' })
  @Transform(({ value }) => trimValue(value))
  @IsOptional()
  @IsString()
  @Matches(FACILITY_CLOSURE_DATE_PATTERN, { message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.DATE_FORMAT_INVALID })
  closureDate?: string;

  @ApiPropertyOptional({ example: 'Cap nhat ly do dong cua' })
  @Transform(({ value }) => trimText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

export class SearchFacilityClosureDayDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @Transform(({ value }) => trimValue(value))
  @IsOptional()
  @IsString()
  @Matches(FACILITY_CLOSURE_DATE_PATTERN, { message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.FROM_DATE_FORMAT_INVALID })
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @Transform(({ value }) => trimValue(value))
  @IsOptional()
  @IsString()
  @Matches(FACILITY_CLOSURE_DATE_PATTERN, { message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.TO_DATE_FORMAT_INVALID })
  toDate?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}
