import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class WeeklyUpdateShiftItemDto {
  @ApiPropertyOptional({ type: String, description: 'Co id thi cap nhat ca cu; khong co id thi tao ca moi.' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  shiftId?: string;

  @ApiProperty({ type: String })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  staffId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roleId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roomId?: string | null;

  @ApiProperty({ type: String })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  slotId: string;

  @ApiProperty({ example: '2026-08-17' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  shiftDate: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxAppointments?: number | null;

  @ApiProperty({ enum: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF] })
  @IsEnum(DoctorShiftStatus)
  status: DoctorShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class WeeklyUpdateShiftsDto {
  @ApiProperty({ type: String })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiProperty({ example: '2026-08-17', description: 'Ngay thu Hai bat dau tuan can cap nhat.' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart: string;

  @ApiProperty({ type: [WeeklyUpdateShiftItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyUpdateShiftItemDto)
  shifts: WeeklyUpdateShiftItemDto[];

  @ApiPropertyOptional({ type: [String], description: 'Cac ca cu da bi bo khoi lich tuan.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(POSITIVE_ID_PATTERN, { each: true })
  removedShiftIds?: string[];
}
