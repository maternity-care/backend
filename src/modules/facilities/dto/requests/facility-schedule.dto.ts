import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { trimValue } from '../../../../common/helpers/dto-transform.helper';
import { IsLaterThan } from '../../../../common/helpers/dto-validation.helper';
import { FacilityDayOfWeek } from '../../entities/facility-operating-hour.entity';

export const FACILITY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
export const WORKING_DAYS_PATTERN = /^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/;

export class FacilityOperatingHourGroupDto {
  @ApiProperty({
    enum: FacilityDayOfWeek,
    isArray: true,
    example: [FacilityDayOfWeek.MON, FacilityDayOfWeek.TUE, FacilityDayOfWeek.WED, FacilityDayOfWeek.THU, FacilityDayOfWeek.FRI],
    description: 'Danh sach ngay ap dung cung mot khung gio',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsEnum(FacilityDayOfWeek, { each: true })
  days: FacilityDayOfWeek[];

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean = false;

  @ApiProperty({ example: '07:00', required: false })
  @ValidateIf((dto: FacilityOperatingHourGroupDto) => dto.isClosed !== true)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'openTime bat buoc khi ngay khong dong cua' })
  @Matches(FACILITY_TIME_PATTERN, { message: 'openTime phai co dinh dang HH:mm hoac HH:mm:ss' })
  openTime?: string;

  @ApiProperty({ example: '19:00', required: false })
  @ValidateIf((dto: FacilityOperatingHourGroupDto) => dto.isClosed !== true)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'closeTime bat buoc khi ngay khong dong cua' })
  @Matches(FACILITY_TIME_PATTERN, { message: 'closeTime phai co dinh dang HH:mm hoac HH:mm:ss' })
  @IsLaterThan('openTime', { message: 'closeTime phai muon hon openTime' })
  closeTime?: string;
}

export class FacilitySchedulesDto {
  @ApiProperty({
    type: [FacilityOperatingHourGroupDto],
    example: [
      {
        days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        openTime: '07:00',
        closeTime: '19:00',
        isClosed: false,
      },
      {
        days: ['SAT'],
        openTime: '08:00',
        closeTime: '17:00',
        isClosed: false,
      },
      {
        days: ['SUN'],
        isClosed: true,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => FacilityOperatingHourGroupDto)
  schedules: FacilityOperatingHourGroupDto[];
}
