import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const BIGINT_ID_PATTERN = /^[1-9]\d*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(?::\d{2})?$/;

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '900138' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  doctorId: string;

  @ApiProperty({ example: '9' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  shiftId: string;

  @ApiProperty({ example: '2026-07-30' })
  @IsString()
  @Matches(DATE_PATTERN)
  date: string;

  @ApiProperty({ example: '09:00:00' })
  @IsString()
  @Matches(TIME_PATTERN)
  startTime: string;

  @ApiProperty({ example: '09:30:00' })
  @IsString()
  @Matches(TIME_PATTERN)
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
