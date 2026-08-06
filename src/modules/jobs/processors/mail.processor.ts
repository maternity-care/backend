import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IMailService, MAIL_SERVICE } from '../../mail/interfaces/mail-service.interface';
import {
  MAIL_QUEUE,
  MailJobData,
  SEND_CREATED_ACCOUNT_EMAIL_JOB,
  SEND_OTP_EMAIL_JOB,
  SEND_PASSWORD_RESET_EMAIL_JOB,
  SEND_SOFT_DELETE_REQUEST_EMAIL_JOB,
  SEND_LOCK_ACCOUNT_EMAIL_JOB,
  SendLockAccountEmailJobData,
} from '../jobs.service';
import { CreatedAccountInterface } from '../../mail/interfaces/created-account.interface';
import {
  RequestSoftDeleteEmailInput,
  SendOTPEmailInput,
  SendPasswordResetEmailInput,
} from '../../mail/interfaces/mail-service.interface';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    @Inject(MAIL_SERVICE)
    private readonly mailService: IMailService,
  ) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<void> {
    try {
      switch (job.name) {
        case SEND_PASSWORD_RESET_EMAIL_JOB:
          await this.mailService.sendPasswordResetEmail(job.data as SendPasswordResetEmailInput);
          return;
        case SEND_CREATED_ACCOUNT_EMAIL_JOB:
          await this.mailService.sendCreatedAccountEmail(job.data as CreatedAccountInterface);
          return;
        case SEND_SOFT_DELETE_REQUEST_EMAIL_JOB:
          await this.mailService.sendSoftDeleteRequestEmail(
            job.data as RequestSoftDeleteEmailInput,
          );
          return;
        case SEND_OTP_EMAIL_JOB:
          await this.mailService.sendOTPEmail(job.data as SendOTPEmailInput);
          return;
        case SEND_LOCK_ACCOUNT_EMAIL_JOB:
          await this.mailService.sendLockAccountEmail(job.data as SendLockAccountEmailJobData);
          return;
        default:
          this.logger.warn(`Unknown mail job name: ${job.name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mail queue error';
      this.logger.error(`Mail job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
