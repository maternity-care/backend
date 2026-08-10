import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import {
  ForumAuthorRole,
  ForumModerationAction,
  ForumTargetType,
} from '../../../common/constants/forum.enum';
import { ContentReportStatus } from '../../../common/constants/status.enum';
import { ContentReport, ReportRole } from '../../../database/entities/content-report.entity';
import { ForumComment } from '../../../database/entities/forum-comment.entity';
import { ForumModerationLog } from '../../../database/entities/forum-moderation-log.entity';
import { ForumPost } from '../../../database/entities/forum-post.entity';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ForumReportQueryDto } from '../dto/requests/forum-query.dto';
import { Staff } from '../../staffs/entities/staff.entity';
import { User } from '../../users/entities/user.entity';

type CreateReportInput = {
  reporterId: string;
  reporterRole: ReportRole;
  targetType: ForumTargetType;
  targetId: string;
  reason: string;
};

type ModerationLogInput = {
  report: ContentReport;
  action: ForumModerationAction;
  actor: AuthenticatedUser;
  actorRole: ForumAuthorRole;
  reason?: string | null;
};

@Injectable()
export class ForumReportsRepository {
  constructor(
    @InjectRepository(ContentReport)
    private readonly reportRepository: Repository<ContentReport>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(ForumComment)
    private readonly commentRepository: Repository<ForumComment>,
    @InjectRepository(ForumModerationLog)
    private readonly moderationLogRepository: Repository<ForumModerationLog>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async targetExists(targetType: ForumTargetType, targetId: string) {
    return targetType === ForumTargetType.POST
      ? this.postRepository.exist({ where: { id: targetId } })
      : this.commentRepository.exist({ where: { id: targetId } });
  }

  async create(input: CreateReportInput) {
    const report = this.reportRepository.create({
      reporterId: input.reporterId,
      reporterRole: input.reporterRole,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      status: ContentReportStatus.PENDING,
      handlerId: null,
      handler: null,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
      resolutionAction: null,
    });

    return this.reportRepository.save(report);
  }

  findById(id: string) {
    return this.reportRepository.findOne({ where: { id } });
  }

  save(report: ContentReport) {
    return this.reportRepository.save(report);
  }

  saveMany(reports: ContentReport[]) {
    return this.reportRepository.save(reports);
  }

  async findPageWithDetails(query: ForumReportQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [reports, total] = await this.reportRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: await this.decorateReports(reports),
      total,
      page,
      limit,
    };
  }

  async findGroupedPageWithDetails(query: ForumReportQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const rawGroups = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.targetType', 'targetType')
      .addSelect('report.targetId', 'targetId')
      .addSelect('COUNT(*)', 'reportCount')
      .addSelect(`SUM(CASE WHEN report.status = :pending THEN 1 ELSE 0 END)`, 'pendingCount')
      .addSelect(`SUM(CASE WHEN report.status = :resolved THEN 1 ELSE 0 END)`, 'resolvedCount')
      .addSelect(`SUM(CASE WHEN report.status = :rejected THEN 1 ELSE 0 END)`, 'rejectedCount')
      .addSelect('MAX(report.createdAt)', 'latestCreatedAt')
      .setParameters({
        pending: ContentReportStatus.PENDING,
        resolved: ContentReportStatus.RESOLVED,
        rejected: ContentReportStatus.REJECTED,
      })
      .groupBy('report.targetType')
      .addGroupBy('report.targetId')
      .orderBy('latestCreatedAt', 'DESC')
      .getRawMany<{
        targetType: ForumTargetType;
        targetId: string;
        reportCount: string;
        pendingCount: string;
        resolvedCount: string;
        rejectedCount: string;
        latestCreatedAt: Date;
      }>();

    const total = rawGroups.length;
    const pageGroups = rawGroups.slice((page - 1) * limit, page * limit);
    const reports = await this.findReportsByTargets(
      pageGroups.map(group => ({
        targetType: group.targetType,
        targetId: String(group.targetId),
      })),
    );
    const decoratedReports = await this.decorateReports(reports);
    const reportsByTarget = new Map<string, Awaited<ReturnType<typeof this.decorateReports>>>();

    for (const report of decoratedReports) {
      const key = this.buildGroupKey(report.targetType, report.targetId);
      reportsByTarget.set(key, [...(reportsByTarget.get(key) ?? []), report]);
    }

    return {
      data: pageGroups.map(group => {
        const targetType = group.targetType;
        const targetId = String(group.targetId);
        const key = this.buildGroupKey(targetType, targetId);
        const groupReports = reportsByTarget.get(key) ?? [];
        const pendingCount = Number(group.pendingCount ?? 0);
        const resolvedCount = Number(group.resolvedCount ?? 0);
        const rejectedCount = Number(group.rejectedCount ?? 0);

        return {
          groupId: key,
          targetType,
          targetId,
          targetContent: groupReports[0]?.targetContent ?? null,
          reports: groupReports,
          latestReport: groupReports[0] ?? null,
          reportCount: Number(group.reportCount ?? groupReports.length),
          pendingCount,
          resolvedCount,
          rejectedCount,
          status: this.resolveGroupStatus(pendingCount, resolvedCount),
          createdAt: groupReports[groupReports.length - 1]?.createdAt ?? group.latestCreatedAt,
          updatedAt: group.latestCreatedAt,
        };
      }),
      total,
      page,
      limit,
    };
  }

  findReportsByTarget(targetType: ForumTargetType, targetId: string) {
    return this.reportRepository.find({
      where: { targetType, targetId },
      order: { createdAt: 'DESC' },
    });
  }

  async createResolutionLog(input: ModerationLogInput) {
    const log = this.moderationLogRepository.create({
      targetType: input.report.targetType,
      targetId: input.report.targetId,
      action: ForumModerationAction.RESOLVE_REPORT,
      actorId: input.actor.id,
      actorRole: input.actorRole,
      reason: input.reason ?? null,
      metadata: {
        reportId: input.report.id,
        resolutionAction: input.action,
      },
    });

    return this.moderationLogRepository.save(log);
  }

  private async findReportsByTargets(
    targets: Array<{ targetType: ForumTargetType; targetId: string }>,
  ) {
    if (!targets.length) return [];

    return this.reportRepository
      .createQueryBuilder('report')
      .where(new Brackets(qb => {
        targets.forEach((target, index) => {
          const condition = `(report.targetType = :targetType${index} AND report.targetId = :targetId${index})`;
          const parameters = {
            [`targetType${index}`]: target.targetType,
            [`targetId${index}`]: target.targetId,
          };
          if (index === 0) qb.where(condition, parameters);
          else qb.orWhere(condition, parameters);
        });
      }))
      .orderBy('report.createdAt', 'DESC')
      .getMany();
  }

  private buildGroupKey(targetType: ForumTargetType, targetId: string) {
    return `${targetType}:${targetId}`;
  }

  private resolveGroupStatus(pendingCount: number, resolvedCount: number) {
    if (pendingCount > 0) return ContentReportStatus.PENDING;
    if (resolvedCount > 0) return ContentReportStatus.RESOLVED;
    return ContentReportStatus.REJECTED;
  }

  private async decorateReports(reports: ContentReport[]) {
    if (!reports.length) return [];

    const userIds = reports
      .filter(report => report.reporterRole === ReportRole.USER)
      .map(report => report.reporterId);
    const staffIds = reports
      .filter(report => report.reporterRole === ReportRole.STAFF)
      .map(report => report.reporterId);
    const postTargetIds = reports
      .filter(report => report.targetType === ForumTargetType.POST)
      .map(report => report.targetId);
    const commentTargetIds = reports
      .filter(report => report.targetType === ForumTargetType.COMMENT)
      .map(report => report.targetId);

    const [users, staffMembers, reportedPosts, reportedComments] = await Promise.all([
      userIds.length
        ? this.userRepository.find({
            where: { id: In([...new Set(userIds)]) },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      staffIds.length
        ? this.staffRepository.find({
            where: { id: In([...new Set(staffIds)]) },
            select: { id: true, name: true, email: true, personalEmail: true },
          })
        : Promise.resolve([]),
      postTargetIds.length
        ? this.postRepository.find({ where: { id: In([...new Set(postTargetIds)]) } })
        : Promise.resolve([]),
      commentTargetIds.length
        ? this.commentRepository.find({
            where: { id: In([...new Set(commentTargetIds)]) },
            relations: { post: true },
          })
        : Promise.resolve([]),
    ]);

    const usersById = new Map(users.map(user => [user.id, user]));
    const staffById = new Map(staffMembers.map(staff => [staff.id, staff]));
    const postsById = new Map(reportedPosts.map(post => [post.id, post]));
    const commentsById = new Map(reportedComments.map(comment => [comment.id, comment]));

    return reports.map(report => {
      const reporter =
        report.reporterRole === ReportRole.STAFF
          ? staffById.get(report.reporterId)
          : usersById.get(report.reporterId);
      const reporterEmail =
        reporter && 'personalEmail' in reporter
          ? reporter.email || reporter.personalEmail
          : reporter?.email;

      return {
        ...report,
        reporterName: reporter?.name ?? null,
        reporterEmail: reporterEmail ?? null,
        targetContent: this.buildTargetContent(report, postsById, commentsById),
      };
    });
  }

  private buildTargetContent(
    report: ContentReport,
    postsById: Map<string, ForumPost>,
    commentsById: Map<string, ForumComment>,
  ) {
    if (report.targetType === ForumTargetType.POST) {
      const post = postsById.get(report.targetId);
      if (!post) return null;

      return {
        type: ForumTargetType.POST,
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.authorId,
        authorRole: post.authorRole,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    }

    const comment = commentsById.get(report.targetId);
    if (!comment) return null;

    return {
      type: ForumTargetType.COMMENT,
      id: comment.id,
      postId: comment.postId,
      postTitle: comment.post?.title ?? null,
      parentId: comment.parentId,
      content: comment.content,
      author: comment.author,
      authorId: comment.authorId,
      authorRole: comment.authorRole,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
