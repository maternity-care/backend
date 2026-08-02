import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(?::\d{2})?$/;

export class CreateUserScheduleDto {
  @ApiProperty({ example: 'Khám thai định kỳ' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'checkup' })
  @IsIn(['checkup', 'ultrasound', 'lab', 'medicine', 'consultation', 'reminder'])
  type: string;

  @ApiProperty({ example: '2026-07-30' })
  @IsString()
  @Matches(DATE_PATTERN)
  date: string;

  @ApiProperty({ example: '08:30' })
  @IsString()
  @Matches(TIME_PATTERN)
  time: string;

  @ApiPropertyOptional({ example: 'Phòng khám Thai sản 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'Mang theo hồ sơ khám gần nhất.' })
  @IsOptional()
  @IsString()
  note?: string;
}
