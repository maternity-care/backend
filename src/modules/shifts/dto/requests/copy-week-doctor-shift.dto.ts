import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class CopyWeekDoctorShiftDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiPropertyOptional({ description: 'Nếu truyền doctorId thì chỉ copy lịch của bác sĩ đó' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  doctorId?: string;

  @ApiProperty({ example: '2026-07-06', description: 'Ngày đầu tuần nguồn, định dạng YYYY-MM-DD' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  sourceWeekStart: string;

  @ApiProperty({ example: '2026-07-13', description: 'Ngày đầu tuần đích, định dạng YYYY-MM-DD' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetWeekStart: string;
}
