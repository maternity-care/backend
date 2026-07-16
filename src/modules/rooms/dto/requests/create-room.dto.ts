import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export const POSITIVE_ID_PATTERN = /^[1-9]\d*$/;

export class CreateRoomDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: 'facilityId phải là số nguyên dương' })
  facilityId: string;

  @ApiProperty({ example: 'Phòng khám 201' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'Khám thai' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  roomType: string;

  @ApiPropertyOptional({ example: 'Tầng 2' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floor?: string;

  @ApiProperty({ enum: ActiveStatus })
  @IsEnum(ActiveStatus)
  status: ActiveStatus;
}

