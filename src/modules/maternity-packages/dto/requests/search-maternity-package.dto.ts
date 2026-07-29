import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';
import { trimText } from '../../../../common/helpers/dto-transform.helper';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class SearchMaternityPackageDto {
  @ApiPropertyOptional({ description: 'Tim theo code, name hoac description' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: MaternityPackageStatus })
  @IsOptional()
  @IsEnum(MaternityPackageStatus)
  status?: MaternityPackageStatus;

  @ApiPropertyOptional({ example: '1', description: 'Lọc gói theo cơ sở quản lý' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  facilityId?: string;

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
