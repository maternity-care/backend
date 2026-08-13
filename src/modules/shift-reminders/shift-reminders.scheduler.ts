import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CHECK_NEXT_WEEK_SHIFTS_JOB, SHIFT_REMINDERS_QUEUE } from './shift-reminders.constants';

@Injectable()
export class ShiftRemindersScheduler implements OnModuleInit {
  constructor(@InjectQueue(SHIFT_REMINDERS_QUEUE) private readonly queue: Queue) {}

  /** Đăng ký một job lặp vào 08:00 thứ Sáu theo giờ Việt Nam. */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      CHECK_NEXT_WEEK_SHIFTS_JOB,
      {},
      {
        jobId: 'weekly-next-shift-reminder',
        repeat: { pattern: '0 8 * * 5', tz: 'Asia/Ho_Chi_Minh' },
        removeOnComplete: 20,
        removeOnFail: 100,
      },
    );
  }
}
