import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FacilityStatus } from '../../../../common/constants/status.enum';
import {
  normalizeWorkingDays,
  trimText,
  trimValue,
} from '../../../../common/helpers/dto-transform.helper';
import { HasUniqueCsvValues, IsLaterThan } from '../../../../common/helpers/dto-validation.helper';

export const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;
export const FACILITY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
export const WORKING_DAYS_PATTERN = /^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/;

export class CreateFacilityDto {
  @ApiProperty({ example: 'Maternity Care Ha Noi' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '1', description: 'Staff id cua nguoi phu trach/chu co so' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'ownerId phai la so nguyen duong' })
  ownerId: string;

  @ApiProperty({ example: '02873001234' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/, {
    message: 'phone phai gom 7-15 chu so va co the bat dau bang dau +',
  })
  phone: string;

  @ApiProperty({ example: 'contact@facility.vn' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'email khong dung dinh dang' })
  @MaxLength(191)
  email: string;

  @ApiProperty({ example: '07:00' })
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty()
  @Matches(FACILITY_TIME_PATTERN, { message: 'openTime phai co dinh dang HH:mm hoac HH:mm:ss' })
  openTime: string;

  @ApiProperty({ example: '17:00' })
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty()
  @Matches(FACILITY_TIME_PATTERN, { message: 'closeTime phai co dinh dang HH:mm hoac HH:mm:ss' })
  @IsLaterThan('openTime', { message: 'closeTime phai muon hon openTime' })
  closeTime: string;

  @ApiProperty({ example: 'MON,TUE,WED,THU,FRI,SAT' })
  @Transform(({ value }) => normalizeWorkingDays(value))
  @IsString()
  @Matches(WORKING_DAYS_PATTERN, {
    message: 'workingDays dung MON,TUE,WED,THU,FRI,SAT,SUN va phan cach bang dau phay',
  })
  @HasUniqueCsvValues({ message: 'workingDays khong duoc chua ngay trung nhau' })
  @MaxLength(255)
  workingDays: string;

  @ApiProperty({ example: '123 Nguyen Trai' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: 'Ha Noi' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  province: string;

  @ApiProperty({ example: 'Dich Vong Hau' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ward: string;

  @ApiProperty({ example: '21.0285' })
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty()
  @IsLatitude({ message: 'latitude phai nam trong khoang -90 den 90' })
  latitude: string;

  @ApiProperty({ example: '105.8542' })
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty()
  @IsLongitude({ message: 'longitude phai nam trong khoang -180 den 180' })
  longitude: string;

  @ApiProperty({ enum: [FacilityStatus.ACTIVE, FacilityStatus.INACTIVE] })
  @IsEnum(FacilityStatus)
  @IsIn([FacilityStatus.ACTIVE, FacilityStatus.INACTIVE], {
    message: 'Khong the tao co so voi trang thai deleted',
  })
  status: FacilityStatus;
}
