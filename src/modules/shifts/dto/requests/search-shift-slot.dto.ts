import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class SearchShiftSlotDto {
  @ApiPropertyOptional({ description: 'Tim theo code/ten khung ca' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Loc khung ca theo co so' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'facilityId phai la so nguyen duong' })
  facilityId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LookupShiftSlotDto {
  @ApiPropertyOptional({ description: 'Tim theo code/ten khung ca' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Loc khung ca dang active cua mot co so de FE hien thi select khi tao shift',
  })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'facilityId phai la so nguyen duong' })
  facilityId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
