import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchFacilityDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc địa chỉ' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo thành phố / tỉnh' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái cơ sở' })
  @IsString()
  @IsOptional()
  status?: string;
}
