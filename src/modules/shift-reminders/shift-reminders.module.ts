import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SHIFT_REMINDERS_QUEUE } from './shift-reminders.constants';
import { ShiftRemindersProcessor } from './shift-reminders.processor';
import { ShiftRemindersRepository } from './shift-reminders.repository';
import { ShiftRemindersScheduler } from './shift-reminders.scheduler';
import { ShiftRemindersService } from './shift-reminders.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: SHIFT_REMINDERS_QUEUE }),
    NotificationsModule,
    MailModule,
  ],
  providers: [
    ShiftRemindersRepository,
    ShiftRemindersService,
    ShiftRemindersProcessor,
    ShiftRemindersScheduler,
  ],
})
export class ShiftRemindersModule {}
