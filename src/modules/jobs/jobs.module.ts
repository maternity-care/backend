import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EXAMPLE_QUEUE, MAIL_QUEUE, NOTIFICATION_QUEUE, JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ExampleProcessor } from './processors/example.processor';
import { MailProcessor } from './processors/mail.processor';
import { MailModule } from '../mail/mail.module';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EXAMPLE_QUEUE,
    }),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    MailModule,
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, ExampleProcessor, MailProcessor, NotificationProcessor],
  exports: [JobsService],
})
export class JobsModule {}
