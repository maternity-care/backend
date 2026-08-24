import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FacilityStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import {
  trimText,
  trimValue,
} from '../../../../common/helpers/dto-transform.helper';
import { FacilityOperatingHourGroupDto } from './facility-schedule.dto';

export const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;

export class CreateFacilityDto {
  @ApiProperty({ example: 'Maternity Care Ha Noi' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: '1', nullable: true, description: 'Staff id cua nguoi phu trach/chu co so' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.FACILITIES.OWNER_ID_INVALID })
  ownerId?: string | null;

  @ApiProperty({ example: '02873001234' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/, {
    message: RESPONSE_MESSAGES.FACILITIES.PHONE_INVALID,
  })
  phone: string;

  @ApiProperty({ example: 'contact@facility.vn' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: RESPONSE_MESSAGES.FACILITIES.EMAIL_INVALID })
  @MaxLength(191)
  email: string;

  @ApiPropertyOptional({
    type: [FacilityOperatingHourGroupDto],
    description: 'Giờ hoạt động của cơ sở. Nếu không gửi, hệ thống mặc định mở từ thứ Hai đến thứ Bảy, 07:00-17:00; Chủ nhật đóng cửa.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => FacilityOperatingHourGroupDto)
  schedules?: FacilityOperatingHourGroupDto[];

  @ApiProperty({ example: '123 Nguyen Trai' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({ example: 'Ha Noi', nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  province?: string | null;

  @ApiPropertyOptional({ example: 'Dich Vong Hau', nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  ward?: string | null;

  @ApiPropertyOptional({ example: 3, nullable: true, default: 1, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  floorCount?: number | null;

  @ApiProperty({ example: '21.0285' })
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty()
  @IsLatitude({ message: RESPONSE_MESSAGES.FACILITIES.LATITUDE_INVALID })
  latitude: string;

  @ApiProperty({ example: '105.8542' })
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty()
  @IsLongitude({ message: RESPONSE_MESSAGES.FACILITIES.LONGITUDE_INVALID })
  longitude: string;

  @ApiProperty({ enum: [FacilityStatus.ACTIVE, FacilityStatus.INACTIVE] })
  @IsEnum(FacilityStatus)
  @IsIn([FacilityStatus.ACTIVE, FacilityStatus.INACTIVE], {
    message: RESPONSE_MESSAGES.FACILITIES.CREATE_DELETED_STATUS_INVALID,
  })
  status: FacilityStatus;
}
