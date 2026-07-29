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

export class CreateFacilityServiceDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiProperty({ example: '3' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceId: string;

  @ApiProperty({ example: '280000.00' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(MONEY_PATTERN, {
    message: 'price phải là số tiền không âm, tối đa 13 chữ số và 2 số thập phân',
  })
  price: string;

  @ApiProperty({ example: 30, minimum: 5, maximum: 480 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  @IsEnum(ActiveStatus)
  status: ActiveStatus;
}

export class BulkFacilityServiceItemDto {
  @ApiProperty({ example: '3' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  serviceId: string;

  @ApiProperty({
    example: '280000.00',
    required: false,
    description: 'Nếu bỏ trống thì lấy theo services.base_price',
  })
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(MONEY_PATTERN, {
    message: 'price phải là số tiền không âm, tối đa 13 chữ số và 2 số thập phân',
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
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE, required: false })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

export class BulkCreateFacilityServicesDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId: string;

  @ApiProperty({ type: [BulkFacilityServiceItemDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: BulkFacilityServiceItemDto) => item.serviceId)
  @ValidateNested({ each: true })
  @Type(() => BulkFacilityServiceItemDto)
  services: BulkFacilityServiceItemDto[];
}
