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
import { MATERNITY_PACKAGE_CONSTANT } from '../../../../common/constants/maternity-package.constant';

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
  @ApiPropertyOptional({ example: '5', description: 'Mã dịch vụ trong danh mục; backend tự tạo cấu hình dịch vụ tại cơ sở khi cần' })
  @ValidateIf((item: MaternityPackageServiceInputDto) => !item.facilityServiceId)
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: MATERNITY_PACKAGE_CONSTANT.SERVICE_ID_INVALID })
  serviceId?: string;

  @ApiPropertyOptional({ example: '3', description: 'Mã cấu hình dịch vụ tại cơ sở, giữ để tương thích payload cũ' })
  @ValidateIf((item: MaternityPackageServiceInputDto) => !item.serviceId)
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: MATERNITY_PACKAGE_CONSTANT.FACILITY_SERVICE_ID_INVALID })
  facilityServiceId?: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.INCLUDED_QUANTITY_INVALID })
  @Min(1, { message: MATERNITY_PACKAGE_CONSTANT.INCLUDED_QUANTITY_INVALID })
  @Max(100, { message: MATERNITY_PACKAGE_CONSTANT.INCLUDED_QUANTITY_INVALID })
  includedQuantity: number;

  @ApiProperty({ example: true })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean({ message: MATERNITY_PACKAGE_CONSTANT.SERVICE_CLASSIFICATION_INVALID })
  isRequired: boolean;

  @ApiProperty({ example: false })
  @Transform(({ value }) => parseBooleanInput(value))
  @IsBoolean({ message: MATERNITY_PACKAGE_CONSTANT.SERVICE_CLASSIFICATION_INVALID })
  isOptional: boolean;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 1000,
    description: 'Thứ tự hiển thị dịch vụ trong cùng một gói/stage; số nhỏ đứng trước',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.SORT_ORDER_INVALID })
  @Min(0, { message: MATERNITY_PACKAGE_CONSTANT.SORT_ORDER_INVALID })
  @Max(1000, { message: MATERNITY_PACKAGE_CONSTANT.SORT_ORDER_INVALID })
  sortOrder?: number;
}

export class MaternityPackageStageInputDto {
  @ApiProperty({ example: 'Tuần 12 - 14' })
  @Transform(({ value }) => trimText(value))
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_NAME_INVALID })
  @IsNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_NAME_INVALID })
  @MinLength(2, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_NAME_INVALID })
  @MaxLength(255, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_NAME_INVALID })
  name: string;

  @ApiPropertyOptional({
    enum: MaternityPackageStageType,
    example: MaternityPackageStageType.PREGNANCY_WEEK,
    default: MaternityPackageStageType.PREGNANCY_WEEK,
  })
  @IsOptional()
  @IsEnum(MaternityPackageStageType, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_TYPE_INVALID })
  stageType?: MaternityPackageStageType;

  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 45, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_INVALID })
  @Min(1, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_INVALID })
  @Max(45, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_INVALID })
  weekFrom?: number | null;

  @ApiPropertyOptional({ example: 14, minimum: 1, maximum: 45, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_INVALID })
  @Min(1, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_INVALID })
  @Max(45, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_WEEK_INVALID })
  weekTo?: number | null;

  @ApiPropertyOptional({
    example: 'Siêu âm hình thái, khảo sát dị tật thai',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_GOAL_TOO_LONG })
  @MaxLength(3000, { message: MATERNITY_PACKAGE_CONSTANT.STAGE_GOAL_TOO_LONG })
  goal?: string | null;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    maximum: 1000,
    description: 'Thứ tự hiển thị mốc/lộ trình trong gói; số nhỏ đứng trước',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.SORT_ORDER_INVALID })
  @Min(0, { message: MATERNITY_PACKAGE_CONSTANT.SORT_ORDER_INVALID })
  @Max(1000, { message: MATERNITY_PACKAGE_CONSTANT.SORT_ORDER_INVALID })
  sortOrder?: number;

  @ApiProperty({
    type: [MaternityPackageServiceInputDto],
    description: 'Danh sách dịch vụ thuộc mốc; ưu tiên gửi mã dịch vụ trong danh mục, backend tự tạo cấu hình tại cơ sở khi cần',
  })
  @IsArray({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_SERVICES_REQUIRED })
  @ArrayNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.STAGE_SERVICES_REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageServiceInputDto)
  services: MaternityPackageServiceInputDto[];
}

export class CreateMaternityPackageDto {
  @ApiProperty({ example: '1' })
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: MATERNITY_PACKAGE_CONSTANT.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiProperty({ example: 'Gói thai sản cơ bản' })
  @Transform(({ value }) => trimText(value))
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.NAME_INVALID })
  @IsNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.NAME_INVALID })
  @MinLength(2, { message: MATERNITY_PACKAGE_CONSTANT.NAME_INVALID })
  @MaxLength(200, { message: MATERNITY_PACKAGE_CONSTANT.NAME_INVALID })
  name: string;

  @ApiPropertyOptional({
    example: 'Gói theo dõi thai kỳ cơ bản cho thai phụ',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.DESCRIPTION_TOO_LONG })
  @MaxLength(3000, { message: MATERNITY_PACKAGE_CONSTANT.DESCRIPTION_TOO_LONG })
  description?: string;

  @ApiPropertyOptional({
    enum: MaternityPackageType,
    example: MaternityPackageType.QUANTITY,
    default: MaternityPackageType.QUANTITY,
    description: 'quantity = gói theo số lượt; schedule = gói theo lịch trình tuần thai/sau sinh',
  })
  @IsOptional()
  @IsEnum(MaternityPackageType, { message: MATERNITY_PACKAGE_CONSTANT.TYPE_INVALID })
  packageType?: MaternityPackageType;

  @ApiProperty({ example: '900000.00' })
  @Transform(({ value }) => trimValue(value))
  @IsString({ message: MATERNITY_PACKAGE_CONSTANT.PRICE_INVALID })
  @Matches(MONEY_PATTERN, {
    message: MATERNITY_PACKAGE_CONSTANT.PRICE_INVALID,
  })
  price: string;

  @ApiPropertyOptional({ example: 90, minimum: 1, maximum: 2000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.DURATION_INVALID })
  @Min(1, { message: MATERNITY_PACKAGE_CONSTANT.DURATION_INVALID })
  @Max(2000, { message: MATERNITY_PACKAGE_CONSTANT.DURATION_INVALID })
  durationDays?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: MATERNITY_PACKAGE_CONSTANT.PRIORITY_INVALID })
  @Min(0, { message: MATERNITY_PACKAGE_CONSTANT.PRIORITY_INVALID })
  @Max(100, { message: MATERNITY_PACKAGE_CONSTANT.PRIORITY_INVALID })
  priorityLevel?: number;

  @ApiProperty({ enum: MaternityPackageStatus, example: MaternityPackageStatus.DRAFT })
  @IsEnum(MaternityPackageStatus, { message: MATERNITY_PACKAGE_CONSTANT.STATUS_INVALID })
  status: MaternityPackageStatus;

  @ApiPropertyOptional({
    type: [MaternityPackageServiceInputDto],
    description: 'Dùng cho gói theo số lượt. Ưu tiên gửi mã dịch vụ; backend tự tạo cấu hình dịch vụ tại cơ sở khi cần.',
  })
  @IsOptional()
  @IsArray({ message: MATERNITY_PACKAGE_CONSTANT.QUANTITY_SERVICES_REQUIRED })
  @ArrayNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.QUANTITY_SERVICES_REQUIRED })
  @ArrayUnique((item: MaternityPackageServiceInputDto) => item.serviceId ?? item.facilityServiceId, {
    message: MATERNITY_PACKAGE_CONSTANT.PACKAGE_ITEM_DUPLICATED,
  })
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageServiceInputDto)
  services?: MaternityPackageServiceInputDto[];

  @ApiPropertyOptional({
    type: [MaternityPackageStageInputDto],
    description: 'Dùng cho packageType = schedule. Mỗi stage là một mốc tuần thai/sau sinh/custom và chứa danh sách dịch vụ riêng.',
  })
  @IsOptional()
  @IsArray({ message: MATERNITY_PACKAGE_CONSTANT.SCHEDULE_STAGES_REQUIRED })
  @ArrayNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.SCHEDULE_STAGES_REQUIRED })
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
    description: 'Danh sách dịch vụ trong gói theo số lượt; ưu tiên dùng mã dịch vụ trong danh mục chung',
  })
  @IsArray({ message: MATERNITY_PACKAGE_CONSTANT.QUANTITY_SERVICES_REQUIRED })
  @ArrayNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.QUANTITY_SERVICES_REQUIRED })
  @ArrayUnique((item: MaternityPackageServiceInputDto) => item.serviceId ?? item.facilityServiceId, {
    message: MATERNITY_PACKAGE_CONSTANT.PACKAGE_ITEM_DUPLICATED,
  })
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
    description: 'Danh sách mốc của gói; mỗi mốc chứa danh sách dịch vụ riêng',
  })
  @IsArray({ message: MATERNITY_PACKAGE_CONSTANT.SCHEDULE_STAGES_REQUIRED })
  @ArrayNotEmpty({ message: MATERNITY_PACKAGE_CONSTANT.SCHEDULE_STAGES_REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => MaternityPackageStageInputDto)
  stages: MaternityPackageStageInputDto[];
}
