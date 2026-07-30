import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';
import { trimText, trimValue } from '../../../../common/helpers/dto-transform.helper';
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
  @ApiPropertyOptional({ example: '5', description: 'ID cua bang services; backend se tu tao facility_services neu can' })
  @ValidateIf((item: MaternityPackageServiceInputDto) => !item.facilityServiceId)
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceId?: string;

  @ApiPropertyOptional({ example: '3', description: 'ID cua bang facility_services; giu de tuong thich payload cu' })
  @ValidateIf((item: MaternityPackageServiceInputDto) => !item.serviceId)
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityServiceId?: string;

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
    description: 'Danh sach dich vu thuoc moc/lo trinh nay; uu tien gui serviceId, backend se tu tao facility_services neu can',
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
    description: 'Dung cho packageType = quantity. Uu tien gui serviceId; backend se tu tao facility_services neu can',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: MaternityPackageServiceInputDto) => item.serviceId ?? item.facilityServiceId)
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

// DTO rieng cho API tao goi theo so luot.
// FE chi gui services[] o root, BE se tu gan packageType = quantity.
export class CreateQuantityMaternityPackageDto extends OmitType(CreateMaternityPackageDto, [
  'packageType',
  'stages',
] as const) {
  @ApiProperty({
    type: [MaternityPackageServiceInputDto],
    description: 'Danh sach dich vu trong goi theo so luot; uu tien dung serviceId cua catalog global',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: MaternityPackageServiceInputDto) => item.serviceId ?? item.facilityServiceId)
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageServiceInputDto)
  services: MaternityPackageServiceInputDto[];
}

// DTO rieng cho API tao goi theo lich trinh/tuan tu.
// FE chi gui stages[], moi stage se chua danh sach services[] rieng.
export class CreateScheduleMaternityPackageDto extends OmitType(CreateMaternityPackageDto, [
  'packageType',
  'services',
] as const) {
  @ApiProperty({
    type: [MaternityPackageStageInputDto],
    description: 'Danh sach moc/lộ trinh cua goi; moi stage chua services[] rieng',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageStageInputDto)
  stages: MaternityPackageStageInputDto[];
}
