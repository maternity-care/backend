import { SepaySignatureGuard } from './../../common/guards/sepay-signature.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { SepayPayload } from './interfaces/sepay-payload.inteface';

@ApiTags('SEPay')
@UseGuards(SepaySignatureGuard)
@Controller('sepay')
export class SEPayController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('callback')
  @ApiOperation({ summary: 'SEPay callback' })
  @ApiResponse({ status: 200 })
  async sepayCallback(@Body() payload: SepayPayload) {
    return this.paymentService.handlePaymentSuccess(payload);
  }
}
