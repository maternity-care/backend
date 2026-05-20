import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateTestJobDto } from './dto/create-test-job.dto';

export const EXAMPLE_QUEUE = 'example';
export const TEST_JOB = 'test';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(EXAMPLE_QUEUE)
    private readonly exampleQueue: Queue,
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
}
