import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MaternityPackageStatus } from '../../../../common/constants/status.enum';

export class SearchMaternityPackageDto {
  @ApiPropertyOptional({ description: 'Tìm theo code, name hoặc description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MaternityPackageStatus })
  @IsOptional()
  @IsEnum(MaternityPackageStatus)
  status?: MaternityPackageStatus;

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
