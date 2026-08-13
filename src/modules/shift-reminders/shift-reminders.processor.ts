import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CHECK_NEXT_WEEK_SHIFTS_JOB, SHIFT_REMINDERS_QUEUE } from './shift-reminders.constants';
import { ShiftRemindersService } from './shift-reminders.service';

@Processor(SHIFT_REMINDERS_QUEUE)
export class ShiftRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(ShiftRemindersProcessor.name);

  constructor(private readonly service: ShiftRemindersService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== CHECK_NEXT_WEEK_SHIFTS_JOB) return;
    const result = await this.service.remindMissingNextWeekSchedules();
    this.logger.log(`Đã kiểm tra ${result.facilities} cơ sở thiếu lịch tuần ${result.weekStart}.`);
  }
}
