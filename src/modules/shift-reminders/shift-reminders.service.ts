import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationReferenceType, NotificationType } from '../../common/constants/notification.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { getNextWeekRange } from './shift-reminders.helper';
import { ShiftRemindersRepository } from './shift-reminders.repository';
import { IMailService, MAIL_SERVICE } from '../mail/interfaces/mail-service.interface';

@Injectable()
export class ShiftRemindersService {
  private readonly logger = new Logger(ShiftRemindersService.name);

  constructor(
    private readonly repository: ShiftRemindersRepository,
    private readonly notificationsService: NotificationsService,
    @Inject(MAIL_SERVICE) private readonly mailService: IMailService,
  ) {}

  /** Kiểm tra tuần sau và tạo tối đa một cảnh báo cho mỗi admin/cơ sở/tuần. */
  async remindMissingNextWeekSchedules(referenceDate = new Date()) {
    const { weekStart, weekEnd } = getNextWeekRange(referenceDate);
    const facilities = await this.repository.findFacilitiesMissingSchedule(weekStart, weekEnd);
    let notifiedAdmins = 0;
    let emailedAdmins = 0;
    let emailFailures = 0;

    for (const facility of facilities) {
      const recipients = await this.repository.findFacilityAdminRecipients(facility.id);
      
      for (const recipient of recipients) {
        await this.notificationsService.createForStaffIfMissing(recipient.id, {
          reference: `missing-shift-week:${facility.id}:${weekStart}`,
          type: NotificationType.REMINDER,
          title: 'Chưa có lịch trực tuần sau',
          content: `${facility.name} chưa có lịch trực từ ${weekStart} đến ${weekEnd}. Vui lòng tạo lịch tuần.`,
          referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
          referenceId: facility.id,
        });
        notifiedAdmins += 1;

        try {
          await this.mailService.sendMissingNextWeekScheduleEmail({
            to: recipient.email,
            name: recipient.name,
            facilityName: facility.name,
            weekStart,
            weekEnd,
          });
          emailedAdmins += 1;
        } catch (error) {
          emailFailures += 1;
          this.logger.error(`Không thể gửi email nhắc lịch cho staff ${recipient.id}.`, error);
        }
      }
    }

    return {
      weekStart,
      weekEnd,
      facilities: facilities.length,
      notifiedAdmins,
      emailedAdmins,
      emailFailures,
    };
  }
}
