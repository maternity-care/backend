import { IsEnum } from 'class-validator';
import { OrderType } from '../../entities/order.entity';
import { OrderItemType } from './../../entities/order-item.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty()
  facilityId: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty()
  orderItems: CreateOrderItemDto[];
}

export class CreateOrderItemDto {
  @ApiProperty()
  itemId: string;

  @ApiProperty()
  @IsEnum(OrderItemType)
  itemType: OrderItemType;

  @ApiProperty()
  @Type(() => Number)
  quantity: number;
}
