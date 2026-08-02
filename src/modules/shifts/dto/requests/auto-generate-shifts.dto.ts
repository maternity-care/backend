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
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  staffId: string;

  @ApiProperty({ type: String, example: '3' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roleId: string;

  @ApiPropertyOptional({ type: String, example: '2', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roomId?: string | null;

  @ApiProperty({ enum: ShiftWorkingDay, isArray: true, example: ['MON', 'WED', 'FRI'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ShiftWorkingDay, { each: true })
  workingDays: ShiftWorkingDay[];

  @ApiPropertyOptional({ type: Number, example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
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
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  slotId: string;

  @ApiProperty({ type: [BulkGenerateShiftAssignmentDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkGenerateShiftAssignmentDto)
  assignments: BulkGenerateShiftAssignmentDto[];
}

export class AutoGenerateShiftsDto {
  @ApiProperty({ type: String, example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Ngay bat dau tao lich. Neu khong gui, backend lay ngay hien tai theo gio Viet Nam.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Ngay ket thuc thu cong. Khong gui dong thoi voi durationDays.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 30,
    minimum: 7,
    maximum: 93,
    description: 'So ngay can render tinh tu fromDate/hom nay. Khong gui dong thoi voi toDate.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(93)
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
    description: 'Neu true, confirm luu cac ca hop le va tra kem cac dong loi. Neu false, con loi nao thi khong luu dong nao.',
  })
  @IsOptional()
  @IsBoolean()
  saveOnlyValid?: boolean = true;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length)
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  doctorId?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roomId?: string | null;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  slotId?: string | null;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ShiftWorkingDay, { each: true })
  workingDays?: ShiftWorkingDay[];

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length && !dto.slotId)
  @Matches(SHIFT_TIME_PATTERN)
  startTime?: string;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length && !dto.slotId)
  @Matches(SHIFT_TIME_PATTERN)
  endTime?: string;

  @ApiHideProperty()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxAppointments?: number | null;

  @ApiHideProperty()
  @ValidateIf((dto: AutoGenerateShiftsDto) => !dto.slotAssignments?.length)
  @IsEnum(DoctorShiftStatus)
  @IsIn([DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], {
    message: RESPONSE_MESSAGES.SHIFTS.BULK_STATUS_INVALID,
  })
  status?: DoctorShiftStatus;
}
