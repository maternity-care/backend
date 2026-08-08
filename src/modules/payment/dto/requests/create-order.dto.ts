import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { OrderType } from '../../entities/order.entity';
import { OrderItemType } from './../../entities/order-item.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty()
  facilityId: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty()
  orderItems: CreateOrderItemDto[];

  @ApiProperty()
  subtotalAmount: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  totalAmount: number;
}

export class CreateOrderItemDto {
  @ApiProperty()
  itemId: string;

  @ApiProperty()
  @IsEnum(OrderItemType)
  itemType: OrderItemType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty()
  @Type(() => Number)
  quantity: number;

  @ApiProperty()
  @Type(() => Number)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
