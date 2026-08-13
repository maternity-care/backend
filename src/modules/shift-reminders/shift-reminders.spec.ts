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
      findFacilityAdminIds: jest.fn().mockResolvedValue(['20', '21']),
    };
    const notifications = { createForStaffIfMissing: jest.fn().mockResolvedValue(undefined) };
    const service = new ShiftRemindersService(repository as never, notifications as never);

    await service.remindMissingNextWeekSchedules(new Date('2026-08-14T01:00:00.000Z'));

    expect(repository.findFacilityAdminIds).toHaveBeenCalledWith('10');
    expect(notifications.createForStaffIfMissing).toHaveBeenCalledTimes(2);
    expect(notifications.createForStaffIfMissing).toHaveBeenCalledWith('20', expect.objectContaining({
      type: NotificationType.REMINDER,
      referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
      reference: 'missing-shift-week:10:2026-08-17',
    }));
  });
});
