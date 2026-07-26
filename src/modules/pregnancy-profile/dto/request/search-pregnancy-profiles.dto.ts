import { PregnancyProfileStatus } from './../../../../common/constants/status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchProfileQueryDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo số điện thoại' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo email' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái thai phụ',
    enum: PregnancyProfileStatus,
  })
  @IsEnum(PregnancyProfileStatus)
  @IsOptional()
  status?: PregnancyProfileStatus;

  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Kích thước trang (mặc định 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
