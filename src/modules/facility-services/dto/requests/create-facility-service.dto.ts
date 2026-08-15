import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimValue } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { MONEY_PATTERN } from '../../../services/dto/requests/create-service.dto';
import { FACILITY_SERVICE_CONSTANT } from '../../../../common/constants/facility-service.constant';

export class CreateFacilityServiceDto {
  @ApiProperty({ example: '1' })
  @IsString({ message: FACILITY_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiProperty({ example: '3' })
  @IsString({ message: FACILITY_SERVICE_CONSTANT.SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.SERVICE_ID_INVALID })
  serviceId: string;

  @ApiProperty({ example: '280000.00' })
  @Transform(({ value }) => trimValue(value))
  @IsString({ message: FACILITY_SERVICE_CONSTANT.PRICE_INVALID })
  @Matches(MONEY_PATTERN, {
    message: FACILITY_SERVICE_CONSTANT.PRICE_INVALID,
  })
  price: string;

  @ApiProperty({ example: 30, minimum: 5, maximum: 480 })
  @Type(() => Number)
  @IsInt({ message: FACILITY_SERVICE_CONSTANT.DURATION_INVALID })
  @Min(5, { message: FACILITY_SERVICE_CONSTANT.DURATION_INVALID })
  @Max(480, { message: FACILITY_SERVICE_CONSTANT.DURATION_INVALID })
  durationMinutes: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  @IsEnum(ActiveStatus, { message: FACILITY_SERVICE_CONSTANT.STATUS_INVALID })
  status: ActiveStatus;
}

export class BulkFacilityServiceItemDto {
  @ApiProperty({ example: '3' })
  @IsString({ message: FACILITY_SERVICE_CONSTANT.SERVICE_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.SERVICE_ID_INVALID })
  serviceId: string;

  @ApiProperty({
    example: '280000.00',
    required: false,
    description: 'Nếu bỏ trống thì lấy theo services.base_price',
  })
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  @IsString({ message: FACILITY_SERVICE_CONSTANT.PRICE_INVALID })
  @Matches(MONEY_PATTERN, {
    message: FACILITY_SERVICE_CONSTANT.PRICE_INVALID,
  })
  price?: string;

  @ApiProperty({
    example: 30,
    minimum: 5,
    maximum: 480,
    required: false,
    description: 'Nếu bỏ trống thì lấy theo services.default_duration_minutes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: FACILITY_SERVICE_CONSTANT.DURATION_INVALID })
  @Min(5, { message: FACILITY_SERVICE_CONSTANT.DURATION_INVALID })
  @Max(480, { message: FACILITY_SERVICE_CONSTANT.DURATION_INVALID })
  durationMinutes?: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(ActiveStatus, { message: FACILITY_SERVICE_CONSTANT.STATUS_INVALID })
  status?: ActiveStatus;
}

export class BulkCreateFacilityServicesDto {
  @ApiProperty({ example: '1' })
  @IsString({ message: FACILITY_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  @Matches(POSITIVE_ID_PATTERN, { message: FACILITY_SERVICE_CONSTANT.FACILITY_ID_INVALID })
  facilityId: string;

  @ApiProperty({ type: [BulkFacilityServiceItemDto], minItems: 1, maxItems: 100 })
  @IsArray({ message: FACILITY_SERVICE_CONSTANT.SERVICES_INVALID })
  @ArrayNotEmpty({ message: FACILITY_SERVICE_CONSTANT.SERVICES_INVALID })
  @ArrayUnique((item: BulkFacilityServiceItemDto) => item.serviceId, {
    message: FACILITY_SERVICE_CONSTANT.SERVICES_INVALID,
  })
  @ValidateNested({ each: true })
  @Type(() => BulkFacilityServiceItemDto)
  services: BulkFacilityServiceItemDto[];
}
