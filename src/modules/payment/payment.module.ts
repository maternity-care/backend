import { PaymentsController } from './payments.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { ManagementPaymentsController } from './management-payments.controller';
import { PAYMENT_REPOSITORY } from './interfaces/payment-repository.interface';
import { PaymentRepository } from './repositories/payment.repository';
import { SEPayController } from './sepay.controller';
import { RealtimeEventsService } from '../realtime/realtime-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Invoice, Payment]), RealtimeEventsService],
  controllers: [ManagementPaymentsController, PaymentsController, SEPayController],
  providers: [PaymentService, { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository }],
  exports: [PaymentService, PAYMENT_REPOSITORY],
})
export class PaymentModule {}
