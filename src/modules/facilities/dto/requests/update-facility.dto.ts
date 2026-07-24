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
  normalizeWorkingDays,
  trimText,
  trimValue,
} from '../../../../common/helpers/dto-transform.helper';
import { HasUniqueCsvValues, IsLaterThan } from '../../../../common/helpers/dto-validation.helper';
import { FACILITY_TIME_PATTERN, POSITIVE_ID_PATTERN, WORKING_DAYS_PATTERN } from './create-facility.dto';

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'ownerId phai la so nguyen duong' })
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.openTime !== undefined || dto.closeTime !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'Khi cap nhat gio hoat dong phai gui ca openTime va closeTime' })
  @Matches(FACILITY_TIME_PATTERN)
  openTime?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.openTime !== undefined || dto.closeTime !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'Khi cap nhat gio hoat dong phai gui ca openTime va closeTime' })
  @Matches(FACILITY_TIME_PATTERN)
  @IsLaterThan('openTime', { message: 'closeTime phai muon hon openTime' })
  closeTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeWorkingDays(value))
  @IsString()
  @Matches(WORKING_DAYS_PATTERN)
  @HasUniqueCsvValues({ message: 'workingDays khong duoc chua ngay trung nhau' })
  @MaxLength(255)
  workingDays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ward?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'Khi cap nhat toa do phai gui ca latitude va longitude' })
  @IsLatitude()
  latitude?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'Khi cap nhat toa do phai gui ca latitude va longitude' })
  @IsLongitude()
  longitude?: string;

  @ApiPropertyOptional({ enum: [FacilityStatus.ACTIVE, FacilityStatus.INACTIVE] })
  @IsOptional()
  @IsEnum(FacilityStatus)
  @IsIn([FacilityStatus.ACTIVE, FacilityStatus.INACTIVE])
  status?: FacilityStatus;
}
