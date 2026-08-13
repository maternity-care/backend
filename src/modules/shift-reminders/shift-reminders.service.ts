import { Injectable } from '@nestjs/common';
import { NotificationReferenceType, NotificationType } from '../../common/constants/notification.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { getNextWeekRange } from './shift-reminders.helper';
import { ShiftRemindersRepository } from './shift-reminders.repository';

@Injectable()
export class ShiftRemindersService {
  constructor(
    private readonly repository: ShiftRemindersRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Kiểm tra tuần sau và tạo tối đa một cảnh báo cho mỗi admin/cơ sở/tuần. */
  async remindMissingNextWeekSchedules(referenceDate = new Date()) {
    const { weekStart, weekEnd } = getNextWeekRange(referenceDate);
    const facilities = await this.repository.findFacilitiesMissingSchedule(weekStart, weekEnd);
    let notifiedAdmins = 0;

    for (const facility of facilities) {
      const adminIds = await this.repository.findFacilityAdminIds(facility.id);
      for (const staffId of adminIds) {
        await this.notificationsService.createForStaffIfMissing(staffId, {
          reference: `missing-shift-week:${facility.id}:${weekStart}`,
          type: NotificationType.REMINDER,
          title: 'Chưa có lịch trực tuần sau',
          content: `${facility.name} chưa có lịch trực từ ${weekStart} đến ${weekEnd}. Vui lòng tạo lịch tuần.`,
          referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
          referenceId: `${facility.id}:${weekStart}`,
        });
        notifiedAdmins += 1;
      }
    }

    return { weekStart, weekEnd, facilities: facilities.length, notifiedAdmins };
  }
}
