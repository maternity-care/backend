import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  roomType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floor?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}

