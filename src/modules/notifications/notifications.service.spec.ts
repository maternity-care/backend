import { NotFoundException } from '@nestjs/common';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../common/constants/notification.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const createRepository = () => ({
    create: jest.fn((value) => ({ id: '1', ...value })),
    save: jest.fn(async (value) => value),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    softRemove: jest.fn(async (value) => value),
  });

  const user = (overrides: Partial<AuthenticatedUser> = {}) => ({
    id: '10',
    employeeCode: undefined,
    personalEmail: undefined,
    roles: [],
    facilities: [],
    ...overrides,
  }) as AuthenticatedUser;

  const input = {
    reference: 'shift-disruption:7',
    type: NotificationType.APPOINTMENT_DISRUPTION,
    title: 'Lịch hẹn bị ảnh hưởng',
    content: 'Ca trực đã thay đổi, vui lòng xử lý lại lịch hẹn.',
    referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
    referenceId: '7',
  };


  it('creates a notification without an userId when the recipient is staff', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as never);
    await service.createForStaffIfMissing('20', input);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: null,
      staffId: '20',
      referenceType: NotificationReferenceType.SHIFT_DISRUPTION,
      referenceId: '7',
      isRead: false,
    }));
    expect(repository.save).toHaveBeenCalledTimes(1);
  })


  it('creates a notification with default reference values and unread state', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as never);

    await service.create({
      userId: '10',
      type: NotificationType.SYSTEM,
      title: 'Thông báo',
      content: 'Nội dung',
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: '10',
      staffId: null,
      referenceType: NotificationReferenceType.PREGNANCY_PROFILE,
      referenceId: '10',
      isRead: false,
    }));
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('does not create a duplicate user notification for the same reference', async () => {
    const repository = createRepository();
    const existing = { id: '99', userId: '10', reference: input.reference };
    repository.findOne.mockResolvedValue(existing);
    const service = new NotificationsService(repository as never);

    await expect(service.createForUserIfMissing('10', input)).resolves.toBe(existing);

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('creates separate staff notifications and scopes the deduplication query to staff', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as never);

    await service.createForStaffIfMissing('20', input);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        reference: input.reference,
        userId: expect.anything(),
        staffId: '20',
      }),
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: null,
      staffId: '20',
      isRead: false,
    }));
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('clamps findMine limit to the supported range', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as never);

    await service.findMine(user(), 500);
    expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));

    await service.findMine(user(), 0);
    expect(repository.find).toHaveBeenLastCalledWith(expect.objectContaining({ take: 1 }));
  });

  it('uses staff recipient scope when the authenticated account has staff markers', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as never);

    await service.findMine(user({ employeeCode: 'EMP-01' }));

    expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { staffId: '10' },
      order: { createdAt: 'DESC' },
    }));
  });

  it('counts only unread notifications belonging to the current recipient', async () => {
    const repository = createRepository();
    repository.count.mockResolvedValue(3);
    const service = new NotificationsService(repository as never);

    await expect(service.countUnreadMine(user())).resolves.toBe(3);
    expect(repository.count).toHaveBeenCalledWith({
      where: { userId: '10', isRead: false },
    });
  });

  it('marks a notification as read only when it belongs to the current user', async () => {
    const repository = createRepository();
    const notification = { id: '7', userId: '10', isRead: false };
    repository.findOne.mockResolvedValue(notification);
    const service = new NotificationsService(repository as never);

    await expect(service.markReadMine('7', user())).resolves.toMatchObject({
      id: '7',
      isRead: true,
    });
    expect(repository.save).toHaveBeenCalledWith(notification);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: '7', userId: '10' },
    });
  });

  it('rejects reading a notification outside the recipient scope', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as never);

    await expect(service.markReadMine('999', user())).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('marks all unread notifications as read and returns the affected count', async () => {
    const repository = createRepository();
    repository.update.mockResolvedValue({ affected: 4 });
    const service = new NotificationsService(repository as never);

    await expect(service.markAllReadMine(user())).resolves.toEqual({ affected: 4 });
    expect(repository.update).toHaveBeenCalledWith(
      { userId: '10', isRead: false },
      { isRead: true },
    );
  });

  it('soft-removes a notification after verifying ownership', async () => {
    const repository = createRepository();
    const notification = { id: '7', userId: '10', isRead: true };
    repository.findOne.mockResolvedValue(notification);
    const service = new NotificationsService(repository as never);

    await expect(service.removeMine('7', user())).resolves.toBe(notification);
    expect(repository.softRemove).toHaveBeenCalledWith(notification);
  });
});
