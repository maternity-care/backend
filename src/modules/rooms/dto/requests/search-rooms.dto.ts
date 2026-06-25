import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchRoomsDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên phòng' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo tầng' })
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái phòng' })
  @IsString()
  @IsOptional()
  status?: string;
}
