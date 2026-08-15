import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText, trimValue } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { SERVICE_CONSTANT } from '../../../../common/constants/service.constant';

// Quy định service có được bán lẻ hay chỉ được dùng bên trong gói.
// Field này giúp FE/booking không hiển thị nhầm service "chỉ trong gói" ở màn mua dịch vụ lẻ.
export enum ServiceSaleMode {
  STANDALONE = 'standalone',
  PACKAGE_ONLY = 'package_only',
  BOTH = 'both',
}

// Giá lưu dạng DECIMAL trong DB nên DTO nhận string để tránh lỗi làm tròn floating point của JS.
export const MONEY_PATTERN = /^(0|[1-9]\d{0,12})(\.\d{1,2})?$/;

// Payload con dùng khi tạo service gốc và muốn gán luôn service đó vào một hoặc nhiều cơ sở.
// Không có serviceId ở đây vì serviceId sẽ được sinh sau khi tạo service gốc.
export class CreateServiceFacilityAssignmentDto {
  @ApiProperty({ example: '1', description: 'ID cơ sở sẽ cung cấp service vừa tạo' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiPropertyOptional({
    example: '280000.00',
    description: 'Giá áp dụng tại cơ sở; bỏ trống thì lấy theo basePrice của service',
  })
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(MONEY_PATTERN, {
    message: SERVICE_CONSTANT.PRICE_INVALID,
  })
  price?: string;

  @ApiPropertyOptional({
    example: 30,
    minimum: 5,
    maximum: 480,
    description: 'Thời lượng tại cơ sở; bỏ trống thì lấy theo defaultDurationMinutes của service',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: ActiveStatus, example: ActiveStatus.ACTIVE, default: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

export class CreateServiceDto {
  @ApiProperty({ example: 'Siêu âm thai 2D' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Dịch vụ siêu âm thai cơ bản', nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '1', description: 'ID của bảng service_types' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceTypeId: string;

  @ApiPropertyOptional({
    enum: ServiceSaleMode,
    example: ServiceSaleMode.BOTH,
    default: ServiceSaleMode.BOTH,
    description: 'standalone = chỉ bán lẻ, package_only = chỉ nằm trong gói, both = cả hai',
  })
  @IsOptional()
  @IsEnum(ServiceSaleMode)
  saleMode?: ServiceSaleMode;

  @ApiProperty({ example: 30, minimum: 5, maximum: 480 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDurationMinutes: number;

  @ApiProperty({ example: '300000.00' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(MONEY_PATTERN, {
    message: SERVICE_CONSTANT.PRICE_INVALID,
  })
  basePrice: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresDoctorWarning?: boolean;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  @IsEnum(ActiveStatus)
  status: ActiveStatus;

  @ApiPropertyOptional({
    type: [CreateServiceFacilityAssignmentDto],
    description: 'Danh sách cơ sở muốn gán service ngay sau khi tạo. Bỏ trống nếu chỉ muốn tạo dịch vụ gốc, chưa assign cơ sở.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: CreateServiceFacilityAssignmentDto) => item.facilityId)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceFacilityAssignmentDto)
  facilityAssignments?: CreateServiceFacilityAssignmentDto[];
}
