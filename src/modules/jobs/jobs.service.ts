import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateTestJobDto } from './dto/request/create-test-job.dto';
import { CreatedAccountInterface } from '../mail/interfaces/created-account.interface';
import {
  RequestSoftDeleteEmailInput,
  SendOTPEmailInput,
  SendPasswordResetEmailInput,
} from '../mail/interfaces/mail-service.interface';

export const EXAMPLE_QUEUE = 'example';
export const TEST_JOB = 'test';
export const MAIL_QUEUE = 'mail';
export const NOTIFICATION_QUEUE = 'notification';
export const SEND_LOCK_ACCOUNT_EMAIL_JOB = 'send-lock-account-email';
export const SEND_PASSWORD_RESET_EMAIL_JOB = 'send-password-reset-email';
export const SEND_CREATED_ACCOUNT_EMAIL_JOB = 'send-created-account-email';
export const SEND_SOFT_DELETE_REQUEST_EMAIL_JOB = 'send-soft-delete-request-email';
export const SEND_OTP_EMAIL_JOB = 'send-otp-email';
export const SEND_EXAM_RESULT_NOTIFICATION_JOB = 'send-exam-result-notification';

export interface ExamResultNotificationJobData {
  patientId: string;
  appointmentId: string;
  appointmentServiceItemId: string;
}

export interface SendLockAccountEmailJobData {
  to: string;
  name: string;
  reason: string;
}

export type MailJobData =
  | SendPasswordResetEmailInput
  | CreatedAccountInterface
  | RequestSoftDeleteEmailInput
  | SendOTPEmailInput
  | SendLockAccountEmailJobData;

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(EXAMPLE_QUEUE)
    private readonly exampleQueue: Queue,
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue<MailJobData>,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<ExamResultNotificationJobData>,
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
    return this.enqueueMailJob(SEND_LOCK_ACCOUNT_EMAIL_JOB, data);
  }

  async enqueuePasswordResetEmail(data: SendPasswordResetEmailInput): Promise<{ jobId: string }> {
    return this.enqueueMailJob(SEND_PASSWORD_RESET_EMAIL_JOB, data);
  }

  async enqueueCreatedAccountEmail(data: CreatedAccountInterface): Promise<{ jobId: string }> {
    return this.enqueueMailJob(SEND_CREATED_ACCOUNT_EMAIL_JOB, data);
  }

  async enqueueSoftDeleteRequestEmail(
    data: RequestSoftDeleteEmailInput,
  ): Promise<{ jobId: string }> {
    return this.enqueueMailJob(SEND_SOFT_DELETE_REQUEST_EMAIL_JOB, data);
  }

  async enqueueOtpEmail(data: SendOTPEmailInput): Promise<{ jobId: string }> {
    return this.enqueueMailJob(SEND_OTP_EMAIL_JOB, data);
  }

  async enqueueExamResultNotification(
    data: ExamResultNotificationJobData,
  ): Promise<{ jobId: string }> {
    const job = await this.notificationQueue.add(SEND_EXAM_RESULT_NOTIFICATION_JOB, data, {
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

  private async enqueueMailJob(name: string, data: MailJobData): Promise<{ jobId: string }> {
    const job = await this.mailQueue.add(name, data, {
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
