import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { AvailabilityStatus } from '../../../../common/constants/status.enum';
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

  @ApiProperty({ enum: AvailabilityStatus, example: AvailabilityStatus.AVAILABLE })
  @IsEnum(AvailabilityStatus)
  status: AvailabilityStatus;
}
