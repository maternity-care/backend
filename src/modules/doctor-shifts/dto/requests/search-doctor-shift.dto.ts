import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class SearchDoctorShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;

  @ApiPropertyOptional({ enum: DoctorShiftStatus })
  @IsOptional()
  @IsEnum(DoctorShiftStatus)
  status?: DoctorShiftStatus;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class WeeklyDoctorShiftDto {
  @ApiPropertyOptional({ description: 'Facility bắt buộc với super admin' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Ngày đầu tuần, định dạng YYYY-MM-DD; mặc định tuần hiện tại' })
  @IsOptional()
  @IsDateString({ strict: true })
  weekStart?: string;
}

