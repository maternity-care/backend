import { NotificationReferenceType, NotificationType } from '../../common/constants/notification.enum';
import { getNextWeekRange } from './shift-reminders.helper';
import { ShiftRemindersService } from './shift-reminders.service';

describe('ShiftRemindersService', () => {
  it('calculates the next Monday to Sunday range in Vietnam time', () => {
    expect(getNextWeekRange(new Date('2026-08-14T01:00:00.000Z'))).toEqual({
      weekStart: '2026-08-17',
      weekEnd: '2026-08-23',
    });
  });

  it('notifies only admin ids returned for the affected facility', async () => {
    const repository = {
      findFacilitiesMissingSchedule: jest.fn().mockResolvedValue([{ id: '10', name: 'Cơ sở A' }]),
      findFacilityAdminRecipients: jest.fn().mockResolvedValue([
        { id: '20', name: 'Admin A', email: 'admin-a@example.com' },
        { id: '21', name: 'Admin B', email: 'admin-b@example.com' },
      ]),
    };
    const notifications = { createForStaffIfMissing: jest.fn().mockResolvedValue(undefined) };
    const mail = { sendMissingNextWeekScheduleEmail: jest.fn().mockResolvedValue(undefined) };
    const service = new ShiftRemindersService(repository as never, notifications as never, mail as never);

    await service.remindMissingNextWeekSchedules(new Date('2026-08-14T01:00:00.000Z'));

    expect(repository.findFacilityAdminRecipients).toHaveBeenCalledWith('10');
    expect(notifications.createForStaffIfMissing).toHaveBeenCalledTimes(2);
    expect(notifications.createForStaffIfMissing).toHaveBeenCalledWith('20', expect.objectContaining({
      type: NotificationType.REMINDER,
      referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
      reference: 'missing-shift-week:10:2026-08-17',
      referenceId: '10',
    }));
    expect(mail.sendMissingNextWeekScheduleEmail).toHaveBeenCalledTimes(2);
    expect(mail.sendMissingNextWeekScheduleEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin-a@example.com',
      facilityName: 'Cơ sở A',
      weekStart: '2026-08-17',
      weekEnd: '2026-08-23',
    }));
  });
});
