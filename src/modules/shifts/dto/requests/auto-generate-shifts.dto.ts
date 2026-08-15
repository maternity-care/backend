import { Type } from 'class-transformer';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { ShiftWorkingDay } from './bulk-create-doctor-shift.dto';
import { SHIFT_TIME_PATTERN } from './create-doctor-shift.dto';

export class BulkGenerateShiftAssignmentDto {
  @ApiProperty({ type: String, example: '10' })
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.STAFF_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.STAFF_ID_INVALID })
  staffId: string;

  @ApiProperty({ type: String, example: '3' })
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.ROLE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROLE_ID_INVALID })
  roleId: string;

  @ApiPropertyOptional({ type: String, example: '2', nullable: true })
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  roomId?: string | null;

  @ApiProperty({ enum: ShiftWorkingDay, isArray: true, example: ['MON', 'WED', 'FRI'] })
  @IsArray({ message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  @ArrayNotEmpty({ message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  @ArrayUnique({ message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  @IsEnum(ShiftWorkingDay, { each: true, message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  workingDays: ShiftWorkingDay[];

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  @Min(1, { message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  @Max(100, { message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  maxAppointments?: number | null;

  @ApiProperty({ enum: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], example: DoctorShiftStatus.AVAILABLE })
  @IsEnum(DoctorShiftStatus)
  @IsIn([DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], {
    message: RESPONSE_MESSAGES.SHIFTS.BULK_STATUS_INVALID,
  })
  status: DoctorShiftStatus;
}

export class BulkGenerateSlotAssignmentDto {
  @ApiProperty({ type: String, example: '1' })
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  slotId: string;

  @ApiProperty({ type: [BulkGenerateShiftAssignmentDto] })
  @IsArray({ message: RESPONSE_MESSAGES.SHIFTS.BULK_ASSIGNMENTS_REQUIRED })
  @ArrayNotEmpty({ message: RESPONSE_MESSAGES.SHIFTS.BULK_ASSIGNMENTS_REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => BulkGenerateShiftAssignmentDto)
  assignments: BulkGenerateShiftAssignmentDto[];
}

export class AutoGenerateShiftsDto {
  @ApiProperty({ type: String, example: '1' })
  @IsString({ message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Ngày bắt đầu tạo lịch. Nếu không gửi, backend lấy ngày hiện tại theo giờ Việt Nam.',
  })
  @IsOptional()
  @IsDateString({ strict: true }, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Ngày kết thúc. Không gửi đồng thời với số ngày cần tạo lịch.',
  })
  @IsOptional()
  @IsDateString({ strict: true }, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
  toDate?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 30,
    minimum: 7,
    maximum: 93,
    description: 'Số ngày cần tạo tính từ ngày bắt đầu. Không gửi đồng thời với ngày kết thúc.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: RESPONSE_MESSAGES.SHIFTS.BULK_DURATION_INVALID })
  @Min(7, { message: RESPONSE_MESSAGES.SHIFTS.BULK_DURATION_INVALID })
  @Max(93, { message: RESPONSE_MESSAGES.SHIFTS.BULK_DURATION_INVALID })
  durationDays?: number;

  @ApiPropertyOptional({ type: [BulkGenerateSlotAssignmentDto] })
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.doctorId)
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkGenerateSlotAssignmentDto)
  slotAssignments?: BulkGenerateSlotAssignmentDto[];

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    example: true,
    description: 'Nếu bật, hệ thống lưu các ca hợp lệ và trả kèm những dòng lỗi. Nếu tắt, chỉ cần có một dòng lỗi thì không lưu ca nào.',
  })
  @IsOptional()
  @IsBoolean()
  saveOnlyValid?: boolean = true;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length)
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.DOCTOR_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.DOCTOR_ID_INVALID })
  doctorId?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  roomId?: string | null;

  @ApiHideProperty()
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  slotId?: string | null;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length)
  @IsArray({ message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  @ArrayNotEmpty({ message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  @ArrayUnique({ message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  @IsEnum(ShiftWorkingDay, { each: true, message: RESPONSE_MESSAGES.SHIFTS.WORKING_DAYS_INVALID })
  workingDays?: ShiftWorkingDay[];

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length && !dto.slotId)
  @Matches(SHIFT_TIME_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.START_TIME_FORMAT_INVALID })
  startTime?: string;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length && !dto.slotId)
  @Matches(SHIFT_TIME_PATTERN, { message: RESPONSE_MESSAGES.SHIFT_SLOTS.END_TIME_FORMAT_INVALID })
  endTime?: string;

  @ApiHideProperty()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  @Min(1, { message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  @Max(100, { message: RESPONSE_MESSAGES.SHIFTS.MAX_APPOINTMENTS_INVALID })
  maxAppointments?: number | null;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length)
  @IsEnum(DoctorShiftStatus)
  @IsIn([DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], {
    message: RESPONSE_MESSAGES.SHIFTS.BULK_STATUS_INVALID,
  })
  status?: DoctorShiftStatus;
}
