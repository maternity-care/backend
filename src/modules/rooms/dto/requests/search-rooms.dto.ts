import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from './create-room.dto';

export class SearchRoomsDto {
  @ApiPropertyOptional({ description: 'Free text search theo id, code hoac name cua phong' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  floor?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.ROOM_TYPE_ID_INVALID })
  roomTypeId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class LookupRoomsDto {
  @ApiPropertyOptional({ description: 'Tu khoa goi y theo id, code hoac name cua phong' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
  facilityId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class LookupRoomTypesDto {
  @ApiPropertyOptional({ description: 'Tu khoa goi y theo id, code hoac name cua loai phong' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SearchRoomTypesDto extends LookupRoomTypesDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
