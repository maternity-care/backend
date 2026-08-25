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

      const { patientId, appointmentId, appointmentServiceItemId, medicalRecordId } = job.data;
      const isServiceResult = Boolean(appointmentServiceItemId);
      const referenceType = isServiceResult
        ? NotificationReferenceType.APPOINTMENT_SERVICE_ITEM
        : NotificationReferenceType.APPOINTMENT;
      const referenceId = isServiceResult ? appointmentServiceItemId! : appointmentId;
      const title = isServiceResult ? 'Đã có kết quả dịch vụ' : 'Đã có kết quả khám';
      const content = isServiceResult
        ? `Kết quả của một chỉ định trong lịch hẹn #${appointmentId} đã được công khai.`
        : `Kết quả khám của lịch hẹn #${appointmentId} đã được công khai.`;
      const reference = medicalRecordId
        ? `exam_result:medical_record:${medicalRecordId}`
        : isServiceResult
        ? `exam_result:appointment_service_item:${appointmentServiceItemId}`
        : `exam_result:appointment:${appointmentId}`;

      await this.notificationsService.createForUserIfMissing(patientId, {
        reference,
        type: NotificationType.EXAM_RESULT,
        title,
        content,
        referenceType,
        referenceId,
      });

      await this.messagingService.notifyUserByPreferredChannel(patientId, content, {
        referenceType: isServiceResult ? 'appointment_service_item' : 'appointment',
        referenceId,
        appointmentId,
        medicalRecordId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification queue error';
      this.logger.error(`Notification job ${job.id} failed: ${message}`);
      throw error;
    }
  }
}
