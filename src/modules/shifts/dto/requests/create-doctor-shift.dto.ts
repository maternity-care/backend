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
  @ApiProperty({ example: '1', description: 'Mã hồ sơ bác sĩ, chỉ giữ để tương thích API cũ. API mới nên dùng mã nhân viên.' })
  @ValidateIf((dto: CreateDoctorShiftDto) => !dto.staffId)
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.DOCTOR_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.DOCTOR_ID_INVALID })
  doctorId?: string;

  @ApiPropertyOptional({ example: '10', description: 'Mã nhân viên được phân công vào ca trực.' })
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.STAFF_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.STAFF_ID_INVALID })
  staffId?: string;

  @ApiPropertyOptional({ example: '3', nullable: true, description: 'Vai trò chuyên môn của nhân viên trong ca trực.' })
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.ROLE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROLE_ID_INVALID })
  roleId?: string | null;

  @ApiProperty({ example: '1' })
  @IsString({ message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiPropertyOptional({ example: '2', nullable: true })
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.ROOM_ID_INVALID })
  roomId?: string | null;

  @ApiPropertyOptional({ example: '1', nullable: true, description: 'Khung ca áp dụng. Khi có khung ca, backend tự lấy giờ bắt đầu và kết thúc từ cấu hình khung ca.' })
  @IsOptional()
  @IsString({ message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.SHIFTS.SLOT_ID_INVALID })
  slotId?: string;

  @ApiProperty({ example: '2026-07-07' })
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
  @IsIn([DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.OFF], {
    message: RESPONSE_MESSAGES.SHIFTS.CREATE_STATUS_INVALID,
  })
  status: DoctorShiftStatus;

  @ApiPropertyOptional({ default:""})
  @IsOptional()
  @IsString()
  note?: string;
}
