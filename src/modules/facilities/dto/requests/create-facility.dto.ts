import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

// facility open_time và close_time phải có định dạng HH:mm hoặc HH:mm:ss
export const FACILITY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
// working_days chỉ được dùng MON,TUE,WED,THU,FRI,SAT,SUN và phân cách bằng dấu phẩy
export const WORKING_DAYS_PATTERN = /^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/;

export class CreateFacilityDto {
  //transform để chuẩn hóa dữ liệu đầu vào, ví dụ trim khoảng trắng, chuẩn hóa code, normalize working days
  @ApiProperty({ example: 'Bệnh viện Phụ sản Trung tâm' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'FAC-HCM-01' })
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,50}$/, {
    message: 'code chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới (2-50 ký tự)',
  })
  code: string;

  @ApiProperty({ example: '02873001234' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/, {
    message: 'phone phải gồm 7-15 chữ số và có thể bắt đầu bằng dấu +',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'contact@facility.vn', nullable: true })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'email không đúng định dạng' })
  @MaxLength(190)
  email?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @ValidateIf((dto: CreateFacilityDto) => dto.open_time !== undefined || dto.close_time !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'open_time và close_time phải được gửi cùng nhau' })
  @Matches(FACILITY_TIME_PATTERN, { message: 'open_time phải có định dạng HH:mm hoặc HH:mm:ss' })
  open_time?: string;

  @ApiPropertyOptional({ example: '17:30' })
  @ValidateIf((dto: CreateFacilityDto) => dto.open_time !== undefined || dto.close_time !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: 'open_time và close_time phải được gửi cùng nhau' })
  @Matches(FACILITY_TIME_PATTERN, { message: 'close_time phải có định dạng HH:mm hoặc HH:mm:ss' })
  @IsLaterThan('open_time', { message: 'close_time phải muộn hơn open_time' })
  close_time?: string;

  @ApiPropertyOptional({ example: 'MON,TUE,WED,THU,FRI,SAT' })
  @IsOptional()
  @Transform(({ value }) => normalizeWorkingDays(value))
  @IsString()
  @Matches(WORKING_DAYS_PATTERN, {
    message: 'working_days dùng MON,TUE,WED,THU,FRI,SAT,SUN và phân cách bằng dấu phẩy',
  })
  @HasUniqueCsvValues({ message: 'working_days không được chứa ngày trùng nhau' })
  @MaxLength(100)
  working_days?: string;

  @ApiProperty({ example: '123 Nguyễn Thị Minh Khai' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province: string;

  @ApiProperty({ example: 'Quận 3' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @ApiProperty({ example: 'Phường 5' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ward: string;

  @ApiPropertyOptional({ example: '10.7756', nullable: true })
  @ValidateIf((dto: CreateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @IsNotEmpty({ message: 'latitude và longitude phải được gửi cùng nhau' })
  @IsLatitude({ message: 'latitude phải nằm trong khoảng -90 đến 90' })
  latitude?: string;

  @ApiPropertyOptional({ example: '106.6871', nullable: true })
  @ValidateIf((dto: CreateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @IsNotEmpty({ message: 'latitude và longitude phải được gửi cùng nhau' })
  @IsLongitude({ message: 'longitude phải nằm trong khoảng -180 đến 180' })
  longitude?: string;

  @ApiProperty({ enum: [FacilityStatus.ACTIVE, FacilityStatus.INACTIVE] })
  @IsEnum(FacilityStatus)
  @IsIn([FacilityStatus.ACTIVE, FacilityStatus.INACTIVE], {
    message: 'Không thể tạo cơ sở với trạng thái deleted',
  })
  status: FacilityStatus;
}
