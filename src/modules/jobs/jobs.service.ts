import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateTestJobDto } from './dto/request/create-test-job.dto';

export const EXAMPLE_QUEUE = 'example';
export const TEST_JOB = 'test';
export const MAIL_QUEUE = 'mail';
export const SEND_LOCK_ACCOUNT_EMAIL_JOB = 'send-lock-account-email';

export interface SendLockAccountEmailJobData {
  to: string;
  name: string;
  reason: string;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(EXAMPLE_QUEUE)
    private readonly exampleQueue: Queue,
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue<SendLockAccountEmailJobData>,
  ) {}

  async createTestJob(dto: CreateTestJobDto): Promise<{ jobId: string }> {
    const job = await this.exampleQueue.add(
      TEST_JOB,
      {
        message: dto.message,
        payload: dto.payload ?? {},
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    );

    return { jobId: String(job.id) };
  }

  async enqueueLockAccountEmail(data: SendLockAccountEmailJobData): Promise<{ jobId: string }> {
    const job = await this.mailQueue.add(SEND_LOCK_ACCOUNT_EMAIL_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    return { jobId: String(job.id) };
  }
}
