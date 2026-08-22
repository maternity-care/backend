import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../../common/constants/notification.enum';
import { MessagingService } from '../../messaging/messaging.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  ExamResultNotificationJobData,
  NOTIFICATION_QUEUE,
  SEND_EXAM_RESULT_NOTIFICATION_JOB,
} from '../jobs.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly messagingService: MessagingService,
  ) {
    super();
  }

  async process(job: Job<ExamResultNotificationJobData>): Promise<void> {
    try {
      if (job.name !== SEND_EXAM_RESULT_NOTIFICATION_JOB) {
        this.logger.warn(`Unknown notification job name: ${job.name}`);
        return;
      }

      const { patientId, appointmentId, appointmentServiceItemId } = job.data;
      const title = 'Đã có kết quả dịch vụ';
      const content = `Kết quả của một chỉ định trong lịch hẹn #${appointmentId} đã được cập nhật.`;

      await this.notificationsService.createForUserIfMissing(patientId, {
        reference: `exam_result:appointment_service_item:${appointmentServiceItemId}`,
        type: NotificationType.EXAM_RESULT,
        title,
        content,
        referenceType: NotificationReferenceType.APPOINTMENT_SERVICE_ITEM,
        referenceId: appointmentServiceItemId,
      });

      await this.messagingService.notifyUserByPreferredChannel(patientId, content, {
        referenceType: 'appointment_service_item',
        referenceId: appointmentServiceItemId,
        appointmentId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification queue error';
      this.logger.error(`Notification job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
