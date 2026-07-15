import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { IsLaterThan } from '../../../../common/helpers/dto-validation.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
//shiftTime định dạng: HH:mm hoặc HH:mm:ss
// ([01]\d|2[0-3]):[0-5]\d: kiểm tra giờ (00-23) và phút (00-59)
// (?::[0-5]\d)?: kiểm tra giây (00-59) nếu có, nhưng không bắt buộc
export const SHIFT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class CreateDoctorShiftDto {
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

  @ApiProperty({ example: '2026-07-07' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'shiftDate phải có định dạng YYYY-MM-DD' })
  shiftDate: string;

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
    message: 'Ca mới chỉ có thể ở trạng thái available hoặc off',
  })
  status: DoctorShiftStatus;
}

