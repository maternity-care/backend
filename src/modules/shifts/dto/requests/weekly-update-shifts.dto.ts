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
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class WeeklyUpdateShiftItemDto {
  @ApiPropertyOptional({ type: String, description: 'Có mã ca trực thì cập nhật ca cũ; không có thì tạo ca mới.' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_ID_INVALID })
  shiftId?: string;

  @ApiProperty({ type: String })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.STAFF_ID_INVALID })
  staffId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROLE_ID_INVALID })
  roleId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  roomId?: string | null;

  @ApiProperty({ type: String })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  slotId: string;

  @ApiProperty({ example: '2026-08-17' })
  @IsDateString({ strict: true }, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  shiftDate: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  @Min(1, { message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  @Max(100, { message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
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
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiProperty({ example: '2026-08-17', description: 'Ngày thứ Hai bắt đầu tuần cần cập nhật.' })
  @IsDateString({ strict: true }, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  weekStart: string;

  @ApiProperty({ type: [WeeklyUpdateShiftItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyUpdateShiftItemDto)
  shifts: WeeklyUpdateShiftItemDto[];

  @ApiPropertyOptional({ type: [String], description: 'Các ca trực cũ đã bị bỏ khỏi lịch tuần.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(POSITIVE_ID_PATTERN, { each: true, message: RESPONSE_MESSAGES.SHIFTS.SHIFT_ID_INVALID })
  removedShiftIds?: string[];
}
