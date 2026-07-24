import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;

export class CreateRoomDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'facilityId phai la so nguyen duong' })
  facilityId: string;

  @ApiProperty({ example: 'Phong kham thai 201' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '1', description: 'ID trong bang room_types' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'roomTypeId phai la so nguyen duong' })
  roomTypeId: string;

  @ApiProperty({ example: 'Tang 2' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  floor: string;

  @ApiProperty({ enum: ActiveStatus })
  @IsEnum(ActiveStatus)
  status: ActiveStatus;
}

export class BulkCreateRoomsDto {
  @ApiProperty({ type: [CreateRoomDto], maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateRoomDto)
  rooms: CreateRoomDto[];
}
