import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { FacilityStatus } from '../../../../common/constants/status.enum';
import {
  normalizeCode,
  normalizeWorkingDays,
  trimText,
  trimValue,
} from '../../../../common/helpers/dto-transform.helper';
import { HasUniqueCsvValues, IsLaterThan } from '../../../../common/helpers/dto-validation.helper';
import { FACILITY_TIME_PATTERN, WORKING_DAYS_PATTERN } from './create-facility.dto';

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,50}$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(190)
  email?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.open_time !== undefined || dto.close_time !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'Khi cập nhật giờ hoạt động phải gửi cả open_time và close_time' })
  @Matches(FACILITY_TIME_PATTERN)
  open_time?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.open_time !== undefined || dto.close_time !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'Khi cập nhật giờ hoạt động phải gửi cả open_time và close_time' })
  @Matches(FACILITY_TIME_PATTERN)
  @IsLaterThan('open_time', { message: 'close_time phải muộn hơn open_time' })
  close_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeWorkingDays(value))
  @IsString()
  @Matches(WORKING_DAYS_PATTERN)
  @HasUniqueCsvValues({ message: 'working_days không được chứa ngày trùng nhau' })
  @MaxLength(100)
  working_days?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ward?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((dto: UpdateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @IsNotEmpty({ message: 'Khi cập nhật tọa độ phải gửi cả latitude và longitude' })
  @IsLatitude()
  latitude?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((dto: UpdateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @IsNotEmpty({ message: 'Khi cập nhật tọa độ phải gửi cả latitude và longitude' })
  @IsLongitude()
  longitude?: string;

  @ApiPropertyOptional({ enum: [FacilityStatus.ACTIVE, FacilityStatus.INACTIVE] })
  @IsOptional()
  @IsEnum(FacilityStatus)
  @IsIn([FacilityStatus.ACTIVE, FacilityStatus.INACTIVE])
  status?: FacilityStatus;
}
