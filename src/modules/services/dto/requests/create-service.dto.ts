import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { normalizeCode, trimText, trimValue } from '../../../../common/helpers/dto-transform.helper';

// Các nhóm dịch vụ phổ biến trong vận hành phòng khám/sản khoa.
export enum ServiceType {
  CONSULTATION = 'consultation',
  ULTRASOUND = 'ultrasound',
  LAB_TEST = 'lab_test',
  SCREENING = 'screening',
  PROCEDURE = 'procedure',
  OTHER = 'other',
}

// Giá lưu dạng DECIMAL trong DB nên DTO nhận string để tránh lỗi làm tròn floating point của JS.
export const MONEY_PATTERN = /^(0|[1-9]\d{0,12})(\.\d{1,2})?$/;

export class CreateServiceDto {
  @ApiProperty({ example: 'US_2D' })
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,50}$/, {
    message: 'code chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới (2-50 ký tự)',
  })
  code: string;

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

  @ApiProperty({ enum: ServiceType, example: ServiceType.ULTRASOUND })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

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
    message: 'basePrice phải là số tiền không âm, tối đa 13 chữ số và 2 số thập phân',
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
}
