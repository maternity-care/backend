import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumAuthorRole, ForumModerationAction } from '../../common/constants/forum.enum';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../common/constants/notification.enum';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { AccountStatus } from '../../common/constants/status.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ContentReport, ReportRole } from '../../database/entities/content-report.entity';
import { ForumComment } from '../../database/entities/forum-comment.entity';
import { ForumPost } from '../../database/entities/forum-post.entity';
import {
  StaffPermission,
  StaffPermissionEffectEnum,
} from '../permissions/entities/staff-permission.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { Staff } from '../staffs/entities/staff.entity';

type ForumRecipient = {
  id: string;
  accountType: 'user' | 'staff';
};

@Injectable()
export class ForumNotificationsService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(StaffPermission)
    private readonly staffPermissionRepository: Repository<StaffPermission>,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  async notifyPostSubmitted(post: ForumPost, actor: AuthenticatedUser): Promise<void> {
    const recipientIds = await this.findStaffIdsWithPermission(PermissionEnum.FORUM_MODERATE);
    await Promise.all(
      recipientIds
        .filter((staffId) => !this.isSameStaffActor(staffId, actor))
        .map((staffId) =>
          this.createForRecipient(
            { id: staffId, accountType: 'staff' },
            {
              reference: `forum:post:${post.id}:submitted`,
              title: 'Bài viết mới chờ duyệt',
              content: `${post.author} vừa gửi bài viết "${post.title}".`,
              referenceType: NotificationReferenceType.FORUM_POST,
              referenceId: post.id,
            },
          ),
        ),
    );
  }

  async notifyPostModerated(
    post: ForumPost,
    action: ForumModerationAction,
    actor: AuthenticatedUser,
    moderationLogId: string,
  ): Promise<void> {
    const message = this.getPostModerationMessage(action, post.moderationReason);
    if (!message) return;

    const recipient = this.authorRecipient(post.authorId, post.authorRole);
    if (this.isSameActor(recipient, actor)) return;

    await this.createForRecipient(recipient, {
      reference: `forum:post:${post.id}:moderation:${moderationLogId}`,
      title: message.title,
      content: message.content,
      referenceType: NotificationReferenceType.FORUM_POST,
      referenceId: post.id,
    });
  }

  async notifyCommentCreated(
    post: ForumPost,
    comment: ForumComment,
    parentComment: ForumComment | null,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const recipient = parentComment
      ? this.authorRecipient(parentComment.authorId, parentComment.authorRole)
      : this.authorRecipient(post.authorId, post.authorRole);

    if (this.isSameActor(recipient, actor)) return;

    const doctorAnswer = Boolean(comment.isDoctorAnswer);
    await this.createForRecipient(recipient, {
      reference: `forum:comment:${comment.id}:created`,
      title: doctorAnswer ? 'Bác sĩ đã trả lời bài viết của bạn' : 'Có phản hồi mới trên diễn đàn',
      content: parentComment
        ? `${comment.author} đã trả lời bình luận của bạn trong bài "${post.title}".`
        : `${comment.author} đã bình luận bài "${post.title}".`,
      referenceType: NotificationReferenceType.FORUM_POST,
      referenceId: post.id,
    });
  }

  async notifyCommentModerated(
    comment: ForumComment,
    action: ForumModerationAction,
    actor: AuthenticatedUser,
    moderationLogId: string,
  ): Promise<void> {
    const message = this.getCommentModerationMessage(action, comment.moderationReason);
    if (!message) return;

    const recipient = this.authorRecipient(comment.authorId, comment.authorRole);
    if (this.isSameActor(recipient, actor)) return;

    await this.createForRecipient(recipient, {
      reference: `forum:comment:${comment.id}:moderation:${moderationLogId}`,
      title: message.title,
      content: message.content,
      referenceType: NotificationReferenceType.FORUM_POST,
      referenceId: comment.postId,
    });
  }

  async notifyReportCreated(report: ContentReport, actor: AuthenticatedUser): Promise<void> {
    const recipientIds = await this.findStaffIdsWithPermission(PermissionEnum.FORUM_REPORT_VIEW);
    await Promise.all(
      recipientIds
        .filter((staffId) => !this.isSameStaffActor(staffId, actor))
        .map((staffId) =>
          this.createForRecipient(
            { id: staffId, accountType: 'staff' },
            {
              reference: `forum:report:${report.id}:created`,
              title: 'Báo cáo nội dung mới',
              content: `Có báo cáo mới cho ${report.targetType} #${report.targetId}.`,
              referenceType: NotificationReferenceType.FORUM_REPORT,
              referenceId: report.id,
            },
          ),
        ),
    );
  }

  async notifyReportResolved(report: ContentReport, actor: AuthenticatedUser): Promise<void> {
    const recipient: ForumRecipient = {
      id: report.reporterId,
      accountType: report.reporterRole === ReportRole.STAFF ? 'staff' : 'user',
    };
    if (this.isSameActor(recipient, actor)) return;

    const resolution = report.resolutionNote?.trim()
      ? ` Lý do: ${report.resolutionNote.trim()}`
      : '';
    await this.createForRecipient(recipient, {
      reference: `forum:report:${report.id}:resolved`,
      title: 'Báo cáo của bạn đã được xử lý',
      content: `Báo cáo nội dung #${report.targetId} đã được xử lý.${resolution}`,
      referenceType: NotificationReferenceType.FORUM_REPORT,
      referenceId: report.id,
    });
  }

  private async findStaffIdsWithPermission(permissionName: PermissionEnum): Promise<string[]> {
    const [staffs, overrides] = await Promise.all([
      this.staffRepository.find({
        where: { status: AccountStatus.ACTIVE },
        relations: { roles: { permissions: true } },
      }),
      this.staffPermissionRepository.find({ relations: { permission: true } }),
    ]);

    return staffs
      .filter((staff) => this.hasPermission(staff, permissionName, overrides))
      .map((staff) => staff.id);
  }

  private hasPermission(
    staff: Staff,
    permissionName: PermissionEnum,
    overrides: StaffPermission[],
  ): boolean {
    if (staff.roles.some((role) => role.name === RoleEnum.SUPER_ADMIN)) return true;

    const matchingOverrides = overrides.filter(
      (override) => override.staffId === staff.id && override.permission?.name === permissionName,
    );
    if (matchingOverrides.some((override) => override.effect === StaffPermissionEffectEnum.DENY)) {
      return false;
    }
    if (matchingOverrides.some((override) => override.effect === StaffPermissionEffectEnum.ALLOW)) {
      return true;
    }

    const moderationRoles = new Set<string>([RoleEnum.ADMIN, RoleEnum.MODERATOR, RoleEnum.STAFF]);
    if (!staff.roles.some((role) => moderationRoles.has(role.name))) return false;

    return staff.roles.some((role) =>
      (role.permissions ?? []).some((permission) => permission.name === permissionName),
    );
  }

  private authorRecipient(authorId: string, authorRole: string): ForumRecipient {
    return {
      id: authorId,
      accountType: authorRole === ForumAuthorRole.USER ? 'user' : 'staff',
    };
  }

  private isSameActor(recipient: ForumRecipient, actor: AuthenticatedUser): boolean {
    if (recipient.id !== actor.id) return false;
    return recipient.accountType === (this.isStaffActor(actor) ? 'staff' : 'user');
  }

  private isSameStaffActor(staffId: string, actor: AuthenticatedUser): boolean {
    return this.isStaffActor(actor) && staffId === actor.id;
  }

  private isStaffActor(actor: AuthenticatedUser): boolean {
    return Boolean(
      actor.employeeCode || actor.personalEmail || actor.roles.length || actor.facilities.length,
    );
  }

  private async createForRecipient(
    recipient: ForumRecipient,
    input: {
      reference: string;
      title: string;
      content: string;
      referenceType: NotificationReferenceType;
      referenceId: string;
    },
  ) {
    const notificationInput = { ...input, type: NotificationType.FORUM };
    const notification =
      recipient.accountType === 'staff'
        ? await this.notificationsService.createForStaffIfMissing(recipient.id, notificationInput)
        : await this.notificationsService.createForUserIfMissing(recipient.id, notificationInput);

    this.realtimeEvents.emitNotification(recipient.accountType, recipient.id, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      referenceType: notification.referenceType,
      referenceId: notification.referenceId,
      createdAt: notification.createdAt,
    });
    return notification;
  }

  private getPostModerationMessage(
    action: ForumModerationAction,
    reason: string | null,
  ): { title: string; content: string } | null {
    const suffix = reason?.trim() ? ` Lý do: ${reason.trim()}` : '';
    switch (action) {
      case ForumModerationAction.APPROVE:
        return { title: 'Bài viết đã được duyệt', content: 'Bài viết của bạn đã được công khai.' };
      case ForumModerationAction.HIDE:
        return { title: 'Bài viết đã bị ẩn', content: `Bài viết của bạn đã bị ẩn.${suffix}` };
      case ForumModerationAction.REJECT:
        return {
          title: 'Bài viết cần chỉnh sửa',
          content: `Bài viết của bạn chưa được duyệt. Bạn có thể chỉnh sửa và gửi lại.${suffix}`,
        };
      case ForumModerationAction.DELETE:
        return { title: 'Bài viết đã bị xóa', content: `Bài viết của bạn đã bị xóa.${suffix}` };
      case ForumModerationAction.LOCK_COMMENTS:
        return {
          title: 'Bài viết đã khóa bình luận',
          content: `Bài viết của bạn đã khóa bình luận.${suffix}`,
        };
      case ForumModerationAction.UNLOCK_COMMENTS:
        return {
          title: 'Bài viết đã mở bình luận',
          content: 'Bài viết của bạn đã được mở lại bình luận.',
        };
      default:
        return null;
    }
  }

  private getCommentModerationMessage(
    action: ForumModerationAction,
    reason: string | null,
  ): { title: string; content: string } | null {
    const suffix = reason?.trim() ? ` Lý do: ${reason.trim()}` : '';
    switch (action) {
      case ForumModerationAction.APPROVE:
        return { title: 'Bình luận đã được duyệt', content: 'Bình luận của bạn đã được hiển thị.' };
      case ForumModerationAction.HIDE:
        return { title: 'Bình luận đã bị ẩn', content: `Bình luận của bạn đã bị ẩn.${suffix}` };
      case ForumModerationAction.REJECT:
        return { title: 'Bình luận bị từ chối', content: `Bình luận của bạn bị từ chối.${suffix}` };
      case ForumModerationAction.DELETE:
        return { title: 'Bình luận đã bị xóa', content: `Bình luận của bạn đã bị xóa.${suffix}` };
      default:
        return null;
    }
  }
}
