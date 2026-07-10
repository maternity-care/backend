import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class DoctorAvailabilityQueryDto {
  @ApiPropertyOptional({ description: 'Facility cần kiểm tra lịch trống của bác sĩ' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiPropertyOptional({ example: '2026-07-13' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @ApiPropertyOptional({ example: 30, minimum: 15, maximum: 240, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  slotMinutes?: number;
}
