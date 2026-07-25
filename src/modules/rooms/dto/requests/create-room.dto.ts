import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;

export class CreateRoomDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.FACILITY_ID_INVALID })
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
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.ROOMS.ROOM_TYPE_ID_INVALID })
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

export class BulkCreateRoomsPreviewDto extends BulkCreateRoomsDto {
  @ApiProperty({
    example: true,
    required: false,
    description:
      'true: confirm chi luu cac phong hop le; false: neu con dong loi thi khong luu dong nao',
  })
  @IsOptional()
  @IsBoolean()
  saveOnlyValid?: boolean = true;
}
