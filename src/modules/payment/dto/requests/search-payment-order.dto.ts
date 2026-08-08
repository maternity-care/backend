import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../../../common/constants/status.enum';

export class SearchPaymentOrderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  itemId?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu filter theo createdAt, format YYYY-MM-DD hoặc timestamp',
  })
  @IsString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc filter theo createdAt, format YYYY-MM-DD hoặc timestamp',
  })
  @IsString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sort?: 'ASC' | 'DESC';
}
