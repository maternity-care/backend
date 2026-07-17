import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';
import { normalizeCode, trimText, trimValue } from '../../../../common/helpers/dto-transform.helper';
import { MONEY_PATTERN } from '../../../services/dto/requests/create-service.dto';

export class CreateMaternityPackageDto {
  @ApiProperty({ example: 'PKG_BASIC' })
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,50}$/, {
    message: 'code chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới (2-50 ký tự)',
  })
  code: string;

  @ApiProperty({ example: 'Gói thai sản cơ bản' })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Gói theo dõi thai kỳ cơ bản cho thai phụ', nullable: true })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiProperty({ example: '900000.00' })
  @Transform(({ value }) => trimValue(value))
  @IsString()
  @Matches(MONEY_PATTERN, {
    message: 'price phải là số tiền không âm, tối đa 13 chữ số và 2 số thập phân',
  })
  price: string;

  @ApiPropertyOptional({ example: 90, minimum: 1, maximum: 2000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  durationDays?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priorityLevel?: number;

  @ApiProperty({ enum: MaternityPackageStatus, example: MaternityPackageStatus.DRAFT })
  @IsEnum(MaternityPackageStatus)
  status: MaternityPackageStatus;
}
