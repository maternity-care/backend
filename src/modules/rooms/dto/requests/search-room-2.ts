import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class SearchRooms2Dto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên phòng' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo tầng' })
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái phòng' })
  @IsEnum(ActiveStatus)
  @IsOptional()
  status?: ActiveStatus;

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
