import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';

export class SearchMaternityPackageDto {
  @ApiPropertyOptional({ description: 'Tìm theo code, name hoặc description' })
  @IsOptional()
  @IsString()
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
