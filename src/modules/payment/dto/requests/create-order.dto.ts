import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { OrderType } from '../../entities/order.entity';
import { OrderItemType } from './../../entities/order-item.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  facilityId: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ type: () => [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'type: normalService, package' })
  @IsEnum(OrderItemType)
  itemType: OrderItemType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  quantity: number;
}
