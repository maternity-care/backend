import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ContentReport, ReportRole } from '../../database/entities/content-report.entity';
import { ForumComment } from '../../database/entities/forum-comment.entity';
import { ForumPost } from '../../database/entities/forum-post.entity';
import {
  StaffPermission,
  StaffPermissionEffectEnum,
} from '../permissions/entities/staff-permission.entity';
import { Staff } from '../staffs/entities/staff.entity';
import { ForumNotificationsService } from './forum-notifications.service';

describe('ForumNotificationsService', () => {
  const staffRepository = { find: jest.fn() };
  const staffPermissionRepository = { find: jest.fn() };
  const notificationsService = {
    createForStaffIfMissing: jest.fn(),
    createForUserIfMissing: jest.fn(),
  };
  const realtimeEvents = { emitNotification: jest.fn() };
  let service: ForumNotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    staffRepository.find.mockResolvedValue([]);
    staffPermissionRepository.find.mockResolvedValue([]);
    notificationsService.createForStaffIfMissing.mockResolvedValue({ id: '1' });
    notificationsService.createForUserIfMissing.mockResolvedValue({ id: '1' });
    service = new ForumNotificationsService(
      staffRepository as never,
      staffPermissionRepository as never,
      notificationsService as never,
      realtimeEvents as never,
    );
  });

  it('notifies only active staff who can moderate forum posts', async () => {
    staffRepository.find.mockResolvedValue([
      staff('1', RoleEnum.SUPER_ADMIN, []),
      staff('2', RoleEnum.ADMIN, [PermissionEnum.FORUM_MODERATE]),
      staff('3', RoleEnum.DOCTOR, [PermissionEnum.FORUM_MODERATE]),
      staff('4', RoleEnum.ADMIN, []),
    ]);
    staffPermissionRepository.find.mockResolvedValue([
      permissionOverride('4', PermissionEnum.FORUM_MODERATE, StaffPermissionEffectEnum.ALLOW),
    ]);

    await service.notifyPostSubmitted(
      { id: '10', author: 'Thai phu A', title: 'Can tu van' } as ForumPost,
      userActor('99'),
    );

    expect(notificationsService.createForStaffIfMissing).toHaveBeenCalledTimes(3);
    expect(notificationsService.createForStaffIfMissing.mock.calls.map((call) => call[0])).toEqual([
      '1',
      '2',
      '4',
    ]);
  });

  it('sends a doctor answer notification to the post owner', async () => {
    await service.notifyCommentCreated(
      { id: '10', authorId: '20', authorRole: 'user', title: 'Hoi bac si' } as ForumPost,
      { id: '30', author: 'Bac si B', authorId: '40', isDoctorAnswer: true } as ForumComment,
      null,
      staffActor('40', RoleEnum.DOCTOR),
    );

    expect(notificationsService.createForUserIfMissing).toHaveBeenCalledWith(
      '20',
      expect.objectContaining({
        reference: 'forum:comment:30:created',
        referenceId: '10',
        title: 'Bác sĩ đã trả lời bài viết của bạn',
      }),
    );
  });

  it('notifies the reporter after another staff account resolves the report', async () => {
    await service.notifyReportResolved(
      {
        id: '50',
        reporterId: '60',
        reporterRole: ReportRole.STAFF,
        targetId: '70',
        resolutionNote: 'Đã kiểm tra',
      } as ContentReport,
      staffActor('80', RoleEnum.MODERATOR),
    );

    expect(notificationsService.createForStaffIfMissing).toHaveBeenCalledWith(
      '60',
      expect.objectContaining({
        reference: 'forum:report:50:resolved',
        referenceId: '50',
      }),
    );
  });
});

function staff(id: string, roleName: RoleEnum, permissions: PermissionEnum[]): Staff {
  return {
    id,
    roles: [
      {
        name: roleName,
        permissions: permissions.map((name) => ({ name })),
      },
    ],
  } as Staff;
}

function permissionOverride(
  staffId: string,
  permissionName: PermissionEnum,
  effect: StaffPermissionEffectEnum,
): StaffPermission {
  return {
    staffId,
    effect,
    permission: { name: permissionName },
  } as StaffPermission;
}

function userActor(id: string): AuthenticatedUser {
  return {
    id,
    name: 'User',
    roles: [],
    facilities: [],
    activeFacilityId: null,
  };
}

function staffActor(id: string, roleName: RoleEnum): AuthenticatedUser {
  return {
    id,
    name: 'Staff',
    employeeCode: `NV-${id}`,
    roles: [{ id: '1', name: roleName, permissions: [] }],
    facilities: [],
    activeFacilityId: null,
  };
}
