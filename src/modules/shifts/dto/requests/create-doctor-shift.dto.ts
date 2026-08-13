import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
//shiftTime định dạng: HH:mm hoặc HH:mm:ss
// ([01]\d|2[0-3]):[0-5]\d: kiểm tra giờ (00-23) và phút (00-59)
// (?::[0-5]\d)?: kiểm tra giây (00-59) nếu có, nhưng không bắt buộc
export const SHIFT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class CreateDoctorShiftDto {
  @ApiProperty({ example: '1', description: 'Legacy doctor profile id. Prefer staffId for new shift APIs.' })
  @ValidateIf((dto: CreateDoctorShiftDto) => !dto.staffId)
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  doctorId?: string;

  @ApiPropertyOptional({ example: '10', description: 'Staff id assigned to this shift. New APIs should use this field.' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  staffId?: string;

  @ApiPropertyOptional({ example: '3', nullable: true, description: 'Role used by the staff member for this shift.' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roleId?: string | null;

  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiPropertyOptional({ example: '2', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roomId?: string | null;

  @ApiPropertyOptional({ example: '1', nullable: true, description: 'Khung ca sang/chieu/toi. Neu co slotId thi backend lay startTime/endTime tu slot.' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  slotId?: string;

  @ApiProperty({ example: '2026-07-07' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: RESPONSE_MESSAGES.SHIFTS.SHIFT_DATE_FORMAT_INVALID })
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
  @IsIn([DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], {
    message: RESPONSE_MESSAGES.SHIFTS.CREATE_STATUS_INVALID,
  })
  status: DoctorShiftStatus;

  @ApiPropertyOptional({ default:""})
  @IsOptional()
  @IsString()
  note?: string;
}
