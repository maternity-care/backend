import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../../common/constants/status.enum';

export class PaymentOrderCustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  email?: string;

  @ApiProperty({ nullable: true })
  phone?: string;
}

export class PaymentOrderFacilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;
}

export class PaymentOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ nullable: true })
  orderType?: string | null;

  @ApiProperty()
  subtotalAmount: number;

  @ApiProperty({ nullable: true })
  discountAmount: number | null;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty({ type: PaymentOrderCustomerResponseDto })
  customer: PaymentOrderCustomerResponseDto;

  @ApiProperty({ type: PaymentOrderFacilityResponseDto })
  facility: PaymentOrderFacilityResponseDto;
}
