import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FacilityStatus } from '../../../../common/constants/status.enum';

export class SearchFacilityDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc địa chỉ' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo thành phố / tỉnh' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái cơ sở', enum: FacilityStatus })
  @IsEnum(FacilityStatus)
  @IsOptional()
  status?: FacilityStatus;

  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Kích thước trang (mặc định 20)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
