import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';
import { normalizeCode, trimText, trimValue } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { MONEY_PATTERN } from '../../../services/dto/requests/create-service.dto';

export enum MaternityPackageType {
  QUANTITY = 'quantity',
  SCHEDULE = 'schedule',
}

export enum MaternityPackageStageType {
  PREGNANCY_WEEK = 'pregnancy_week',
  POSTPARTUM = 'postpartum',
  CUSTOM = 'custom',
}

function parseBooleanInput(value: unknown): unknown {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return value;
}

export class MaternityPackageServiceInputDto {
  @ApiProperty({ example: '3', description: 'ID của bảng facility_services, không phải services.id' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityServiceId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  includedQuantity: number;

  @ApiProperty({ example: true })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ example: false })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean()
  isOptional: boolean;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 1000,
    description: 'Thứ tự hiển thị dịch vụ trong cùng một gói/stage; số nhỏ đứng trước',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class MaternityPackageStageInputDto {
  @ApiProperty({ example: 'Tuần 12 - 14' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    enum: MaternityPackageStageType,
    example: MaternityPackageStageType.PREGNANCY_WEEK,
    default: MaternityPackageStageType.PREGNANCY_WEEK,
  })
  @IsOptional()
  @IsEnum(MaternityPackageStageType)
  stageType?: MaternityPackageStageType;

  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 45, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(45)
  weekFrom?: number | null;

  @ApiPropertyOptional({ example: 14, minimum: 1, maximum: 45, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(45)
  weekTo?: number | null;

  @ApiPropertyOptional({
    example: 'Siêu âm hình thái, khảo sát dị tật thai',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(3000)
  goal?: string | null;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 1000,
    description: 'Thứ tự hiển thị mốc/lộ trình trong gói; số nhỏ đứng trước',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiProperty({
    type: [MaternityPackageServiceInputDto],
    description: 'Danh sách dịch vụ thuộc mốc/lộ trình này; phải là facilityServiceId của cùng cơ sở với gói',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageServiceInputDto)
  services: MaternityPackageServiceInputDto[];
}

export class CreateMaternityPackageDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiProperty({ example: 'PKG_BASIC' })
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,50}$/, {
    message: 'code chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới (2-50 ký tự)',
  })
  code: string;

  @ApiProperty({ example: 'Gói thai sản cơ bản' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'Gói theo dõi thai kỳ cơ bản cho thai phụ',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    enum: MaternityPackageType,
    example: MaternityPackageType.QUANTITY,
    default: MaternityPackageType.QUANTITY,
    description: 'quantity = gói theo số lượt; schedule = gói theo lịch trình tuần thai/sau sinh',
  })
  @IsOptional()
  @IsEnum(MaternityPackageType)
  packageType?: MaternityPackageType;

  @ApiProperty({ example: '900000.00' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(MONEY_PATTERN, {
    message: 'price phải là số tiền không âm, tối đa 13 chữ số và 2 số thập phân',
  })
  price: string;

  @ApiPropertyOptional({ example: 90, minimum: 1, maximum: 2000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  durationDays?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priorityLevel?: number;

  @ApiProperty({ enum: MaternityPackageStatus, example: MaternityPackageStatus.DRAFT })
  @IsEnum(MaternityPackageStatus)
  status: MaternityPackageStatus;

  @ApiPropertyOptional({
    type: [MaternityPackageServiceInputDto],
    description: 'Dùng cho packageType = quantity. Danh sách dịch vụ trong gói; dùng facilityServiceId để giữ đúng giá/thời lượng theo cơ sở',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: MaternityPackageServiceInputDto) => item.facilityServiceId)
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageServiceInputDto)
  services?: MaternityPackageServiceInputDto[];

  @ApiPropertyOptional({
    type: [MaternityPackageStageInputDto],
    description: 'Dùng cho packageType = schedule. Mỗi stage là một mốc tuần thai/sau sinh/custom và chứa danh sách dịch vụ riêng.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageStageInputDto)
  stages?: MaternityPackageStageInputDto[];
}
