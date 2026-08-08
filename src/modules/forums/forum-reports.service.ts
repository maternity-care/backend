import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ForumAuthorRole,
  ForumModerationAction,
  ForumTargetType,
} from '../../common/constants/forum.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { ContentReportStatus } from '../../common/constants/status.enum';
import { getUserRoles } from '../../common/helpers/auth.helper';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ReportRole } from '../../database/entities/content-report.entity';
import { CreateContentReportDto } from './dto/requests/create-content-report.dto';
import { ForumReportQueryDto } from './dto/requests/forum-query.dto';
import { ResolveContentReportDto } from './dto/requests/moderate-forum-content.dto';
import { ForumNotificationsService } from './forum-notifications.service';
import { ForumsService } from './forums.service';
import { ForumReportsRepository } from './repositories/forum-reports.repository';
import { RealtimeEventsService } from '../realtime/realtime-events.service';

@Injectable()
export class ForumReportsService {
  constructor(
    private readonly forumReportsRepository: ForumReportsRepository,
    private readonly forumsService: ForumsService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly forumNotifications: ForumNotificationsService,
  ) {}

  async createReport(dto: CreateContentReportDto, actor: AuthenticatedUser) {
    await this.ensureReportTargetExists(dto.targetType, dto.targetId);
    const saved = await this.forumReportsRepository.create({
      reporterId: actor.id,
      reporterRole: this.isStaffActor(actor) ? ReportRole.STAFF : ReportRole.USER,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
    });

    await this.forumNotifications.notifyReportCreated(saved, actor);
    this.realtimeEvents.emitForumEvent(
      'forum:report.created',
      {
        id: saved.id,
        targetType: saved.targetType,
        targetId: saved.targetId,
      },
      {
        management: true,
        public: false,
        postRoom: false,
      },
    );

    return saved;
  }

  findReports(query: ForumReportQueryDto) {
    return this.forumReportsRepository.findPageWithDetails(query);
  }

  async resolveReport(id: string, dto: ResolveContentReportDto, actor: AuthenticatedUser) {
    const report = await this.forumReportsRepository.findById(id);
    if (!report) throw new NotFoundException('Khong tim thay report');

    if (
      [
        ForumModerationAction.APPROVE,
        ForumModerationAction.HIDE,
        ForumModerationAction.REJECT,
        ForumModerationAction.DELETE,
      ].includes(dto.action)
    ) {
      await this.applyReportTargetAction(report.targetType, report.targetId, dto.action, actor, dto.note ?? null);
    }

    report.status = ContentReportStatus.RESOLVED;
    report.handlerId = actor.id;
    report.resolvedBy = actor.id;
    report.resolvedAt = new Date();
    report.resolutionAction = dto.action;
    report.resolutionNote = dto.note ?? null;

    const saved = await this.forumReportsRepository.save(report);
    await this.forumReportsRepository.createResolutionLog({
      report,
      action: dto.action,
      actor,
      actorRole: this.resolveAuthorRole(actor),
      reason: dto.note ?? null,
    });
    await this.forumNotifications.notifyReportResolved(saved, actor);
    this.realtimeEvents.emitForumEvent(
      'forum:report.resolved',
      {
        id: saved.id,
        targetType: saved.targetType,
        targetId: saved.targetId,
        action: dto.action,
      },
      {
        management: true,
        public: false,
        postRoom: false,
      },
    );

    return saved;
  }

  private async ensureReportTargetExists(targetType: ForumTargetType, targetId: string) {
    if (!(await this.forumReportsRepository.targetExists(targetType, targetId))) {
      throw new NotFoundException('Khong tim thay noi dung can report');
    }
  }

  private async applyReportTargetAction(
    targetType: ForumTargetType,
    targetId: string,
    action: ForumModerationAction,
    actor: AuthenticatedUser,
    reason: string | null,
  ) {
    if (targetType === ForumTargetType.POST) {
      await this.forumsService.moderatePost(targetId, { action, reason }, actor);
      return;
    }

    await this.forumsService.moderateComment(targetId, { action, reason }, actor);
  }

  private resolveAuthorRole(actor: AuthenticatedUser): ForumAuthorRole {
    const roles = getUserRoles(actor);
    if (roles.includes(RoleEnum.ADMIN) || roles.includes(RoleEnum.SUPER_ADMIN)) {
      return ForumAuthorRole.ADMIN;
    }
    if (roles.includes(RoleEnum.MODERATOR)) return ForumAuthorRole.MODERATOR;
    if (roles.includes(RoleEnum.DOCTOR)) return ForumAuthorRole.DOCTOR;
    if (this.isStaffActor(actor)) return ForumAuthorRole.STAFF;
    return ForumAuthorRole.USER;
  }

  private isStaffActor(actor: AuthenticatedUser): boolean {
    const roles = getUserRoles(actor);
    return Boolean(actor.employeeCode || actor.activeFacilityId || roles.some(role =>
      role === 'manager' ||
      [
        RoleEnum.SUPER_ADMIN,
        RoleEnum.ADMIN,
        RoleEnum.MODERATOR,
        RoleEnum.DOCTOR,
        RoleEnum.NURSE,
        RoleEnum.STAFF,
      ].includes(role as RoleEnum),
    ));
  }
}
