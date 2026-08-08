import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserSearchOrderDto } from './user-search.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderType } from '../../entities/order.entity';

export class SearchOrderDto extends UserSearchOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiPropertyOptional()
  @IsOptional()
  paymentMethod?: 'cash' | 'bank';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortCustomer?: 'ASC' | 'DESC';
}
