import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EXAMPLE_QUEUE, MAIL_QUEUE, JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ExampleProcessor } from './processors/example.processor';
import { MailProcessor } from './processors/mail.processor';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EXAMPLE_QUEUE,
    }),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
    MailModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, ExampleProcessor, MailProcessor],
  exports: [JobsService],
})
export class JobsModule {}
