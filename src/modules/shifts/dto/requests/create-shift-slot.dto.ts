import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { SHIFT_TIME_PATTERN } from './create-doctor-shift.dto';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export const SHIFT_SLOT_APPLICABLE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export type ShiftSlotApplicableDay = typeof SHIFT_SLOT_APPLICABLE_DAYS[number];

export class CreateShiftSlotDto {
  @ApiProperty({ example: '1', description: 'Co so so huu khung ca nay' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiProperty({ example: 'Ca sang' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '07:00' })
  @Transform(({ value }) => trimText(value))
  @Matches(SHIFT_TIME_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.START_TIME_FORMAT_INVALID })
  startTime: string;

  @ApiProperty({ example: '12:00', description: 'Co the nho hon startTime neu la ca dem, vi du 18:00 -> 03:00.' })
  @Transform(({ value }) => trimText(value))
  @Matches(SHIFT_TIME_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.END_TIME_FORMAT_INVALID })
  endTime: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOvernight?: boolean = false;

  @ApiPropertyOptional({
    enum: SHIFT_SLOT_APPLICABLE_DAYS,
    isArray: true,
    description: 'Nếu không gửi, hệ thống tự xác định các ngày mở cửa phù hợp với khung giờ.',
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const values = Array.isArray(value) ? value : [value];
    return values.map(item => String(item).trim().toUpperCase());
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(SHIFT_SLOT_APPLICABLE_DAYS, { each: true })
  applicableDays?: ShiftSlotApplicableDay[];

  @ApiPropertyOptional({ enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus = ActiveStatus.ACTIVE;
}
