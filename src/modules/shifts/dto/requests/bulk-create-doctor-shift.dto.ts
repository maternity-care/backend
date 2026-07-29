import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
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
} from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { SHIFT_TIME_PATTERN } from './create-doctor-shift.dto';

export enum ShiftWorkingDay {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export class BulkCreateDoctorShiftDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  doctorId: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiPropertyOptional({ example: '2', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roomId?: string;

  @ApiPropertyOptional({
    example: '1',
    nullable: true,
    description: 'Khung ca sáng/chiều/tối. Nếu có slotId thì backend lấy startTime/endTime từ slot.',
  })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  slotId?: string | null;

  @ApiPropertyOptional({
    example: '2026-07-13',
    description: 'Ngày bắt đầu tạo ca. Nếu không gửi, backend tự lấy ngày hiện tại theo giờ Việt Nam.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-07-31',
    description: 'Ngày kết thúc thủ công. Không gửi đồng thời với durationDays.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string;

  @ApiPropertyOptional({
    example: 14,
    minimum: 7,
    maximum: 93,
    description: 'Số ngày cần render tính từ fromDate/hôm nay. FE tự gán nút 1 tuần=7, 1 tháng=30, 3 tháng=90.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(93)
  durationDays?: number;

  @ApiProperty({ enum: ShiftWorkingDay, isArray: true, example: ['MON', 'WED', 'FRI'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ShiftWorkingDay, { each: true })
  workingDays: ShiftWorkingDay[];

  @ApiPropertyOptional({ example: '08:00', description: 'Bắt buộc nếu không gửi slotId' })
  @ValidateIf((dto: BulkCreateDoctorShiftDto) => !dto.slotId)
  @Matches(SHIFT_TIME_PATTERN)
  startTime?: string;

  @ApiPropertyOptional({ example: '12:00', description: 'Bắt buộc nếu không gửi slotId' })
  @ValidateIf((dto: BulkCreateDoctorShiftDto) => !dto.slotId)
  @Matches(SHIFT_TIME_PATTERN)
  endTime?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxAppointments?: number | null;

  @ApiProperty({ enum: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF] })
  @IsEnum(DoctorShiftStatus)
  @IsIn([DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], {
    message: RESPONSE_MESSAGES.SHIFTS.BULK_STATUS_INVALID,
  })
  status: DoctorShiftStatus;
}
