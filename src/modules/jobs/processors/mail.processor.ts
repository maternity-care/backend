import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IMailService, MAIL_SERVICE } from '../../mail/interfaces/mail-service.interface';
import {
  MAIL_QUEUE,
  SEND_LOCK_ACCOUNT_EMAIL_JOB,
  SendLockAccountEmailJobData,
} from '../jobs.service';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    @Inject(MAIL_SERVICE)
    private readonly mailService: IMailService,
  ) {
    super();
  }

  async process(job: Job<SendLockAccountEmailJobData>): Promise<void> {
    try {
      if (job.name !== SEND_LOCK_ACCOUNT_EMAIL_JOB) {
        this.logger.warn(`Unknown mail job name: ${job.name}`);
        return;
      }

      await this.mailService.sendLockAccountEmail(job.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mail queue error';
      this.logger.error(`Mail job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
