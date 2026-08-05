import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RESPONSE_MESSAGES } from '../../../../common/constants/response-message.constant';
import {
  trimText,
  trimValue,
} from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from './create-facility.dto';

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN, { message: RESPONSE_MESSAGES.FACILITIES.OWNER_ID_INVALID })
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  province?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  ward?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: RESPONSE_MESSAGES.FACILITIES.COORDINATE_PAIR_REQUIRED })
  @IsLatitude({ message: RESPONSE_MESSAGES.FACILITIES.LATITUDE_INVALID })
  latitude?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateFacilityDto) => dto.latitude !== undefined || dto.longitude !== undefined)
  @Transform(({ value }) => trimValue(value))
  @IsNotEmpty({ message: RESPONSE_MESSAGES.FACILITIES.COORDINATE_PAIR_REQUIRED })
  @IsLongitude({ message: RESPONSE_MESSAGES.FACILITIES.LONGITUDE_INVALID })
  longitude?: string;

}
