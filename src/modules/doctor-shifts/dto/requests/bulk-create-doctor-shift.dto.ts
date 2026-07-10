import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { IsLaterThan } from '../../../../common/helpers/dto-validation.helper';
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
  roomId?: string | null;

  @ApiProperty({ example: '2026-07-13' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate: string;

  @ApiProperty({ enum: ShiftWorkingDay, isArray: true, example: ['MON', 'WED', 'FRI'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ShiftWorkingDay, { each: true })
  workingDays: ShiftWorkingDay[];

  @ApiProperty({ example: '08:00' })
  @Matches(SHIFT_TIME_PATTERN)
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @Matches(SHIFT_TIME_PATTERN)
  @IsLaterThan('startTime', { message: 'endTime phải muộn hơn startTime' })
  endTime: string;

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
    message: 'Ca tạo hàng loạt chỉ có thể ở trạng thái available hoặc off',
  })
  status: DoctorShiftStatus;
}
