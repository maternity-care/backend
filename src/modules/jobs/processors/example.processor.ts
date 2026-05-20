import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EXAMPLE_QUEUE, TEST_JOB } from '../jobs.service';

interface TestJobData {
  message: string;
  payload: Record<string, unknown>;
}

@Processor(EXAMPLE_QUEUE)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job<TestJobData>): Promise<void> {
    try {
      if (job.name !== TEST_JOB) {
        this.logger.warn(`Unknown job name: ${job.name}`);
        return;
      }

      this.logger.log(`Processing job ${job.id}: ${job.data.message}`);
      this.logger.debug(JSON.stringify(job.data.payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown queue processing error';
      this.logger.error(`Job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
