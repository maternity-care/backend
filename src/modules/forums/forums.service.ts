import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  ForumAuthorRole,
  ForumModerationAction,
  ForumTargetType,
} from '../../common/constants/forum.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import {
  ActiveStatus,
  ContentReportStatus,
  ForumContentStatus,
} from '../../common/constants/status.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { getUserRoles } from '../../common/helpers/auth.helper';
import { ContentReport, ReportRole } from '../../database/entities/content-report.entity';
import { ForumCategoryMetadata } from '../../database/entities/forum-category-metadata.entity';
import { ForumComment } from '../../database/entities/forum-comment.entity';
import { ForumModerationLog } from '../../database/entities/forum-moderation-log.entity';
import { ForumPost } from '../../database/entities/forum-post.entity';
import { ForumTopic } from '../../database/entities/forum-topic.entity';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { CreateContentReportDto } from './dto/requests/create-content-report.dto';
import { CreateForumCommentDto } from './dto/requests/create-forum-comment.dto';
import { CreateForumPostDto } from './dto/requests/create-forum-post.dto';
import { CreateForumTopicDto } from './dto/requests/create-forum-topic.dto';
import { ForumPostQueryDto, ForumReportQueryDto } from './dto/requests/forum-query.dto';
import {
  ModerateForumContentDto,
  ResolveContentReportDto,
} from './dto/requests/moderate-forum-content.dto';
import { UpdateForumTopicDto } from './dto/requests/update-forum-topic.dto';

const MEDICAL_DISCLAIMER = 'Thông tin tham khảo, không thay thế tư vấn bác sĩ.';

@Injectable()
export class ForumsService {
  constructor(
    @InjectRepository(ForumTopic)
    private readonly topicRepository: Repository<ForumTopic>,
    @InjectRepository(ForumCategoryMetadata)
    private readonly categoryRepository: Repository<ForumCategoryMetadata>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(ForumComment)
    private readonly commentRepository: Repository<ForumComment>,
    @InjectRepository(ContentReport)
    private readonly reportRepository: Repository<ContentReport>,
    @InjectRepository(ForumModerationLog)
    private readonly moderationLogRepository: Repository<ForumModerationLog>,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  getDisclaimer() {
    return { message: MEDICAL_DISCLAIMER };
  }

  getCategories() {
    return this.categoryRepository.find({
      where: { status: ActiveStatus.ACTIVE },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  findActiveTopics() {
    return this.topicRepository.find({
      where: { status: ActiveStatus.ACTIVE },
      order: { category: 'ASC', title: 'ASC' },
    });
  }

  async createTopic(dto: CreateForumTopicDto, actor: AuthenticatedUser) {
    const topic = this.topicRepository.create({
      ...dto,
      authorId: actor.id,
      slug: await this.createUniqueTopicSlug(dto.title),
      description: dto.description ?? null,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
    return this.topicRepository.save(topic);
  }

  async updateTopic(id: string, dto: UpdateForumTopicDto) {
    const topic = await this.findTopicById(id);
    Object.assign(topic, {
      ...dto,
      ...(dto.title ? { slug: await this.createUniqueTopicSlug(dto.title, id) } : {}),
      description: dto.description === undefined ? topic.description : dto.description,
    });
    return this.topicRepository.save(topic);
  }

  async findPublicPosts(query: ForumPostQueryDto) {
    return this.findPosts({ ...query, status: ForumContentStatus.PUBLISHED }, false);
  }

  async findManagementPosts(query: ForumPostQueryDto) {
    return this.findPosts(query, true);
  }

  async findPostDetails(id: string, management = false) {
    const post = await this.postRepository.findOne({
      where: management ? { id } : { id, status: ForumContentStatus.PUBLISHED },
      relations: { forumTopic: true },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const comments = await this.commentRepository.find({
      where: management
        ? { postId: id }
        : { postId: id, status: ForumContentStatus.PUBLISHED },
      order: { isDoctorAnswer: 'DESC', createdAt: 'ASC' },
    });

    return { medicalDisclaimer: MEDICAL_DISCLAIMER, post, comments };
  }

  async createPost(dto: CreateForumPostDto, actor: AuthenticatedUser) {
    const topic = await this.findActiveTopicById(dto.topicId);
    const authorRole = this.resolveAuthorRole(actor);
    const status = ForumContentStatus.PENDING;

    const post = this.postRepository.create({
      forumTopicId: topic.id,
      category: topic.category,
      author: actor.name ?? actor.email ?? `User ${actor.id}`,
      authorId: actor.id,
      authorRole,
      title: dto.title,
      slug: await this.createUniquePostSlug(dto.title),
      content: dto.content,
      coverImageUrl: dto.coverImageUrl ?? null,
      status,
      approvedBy: null,
      approvedAt: null,
      moderationReason: null,
    });

    const saved = await this.postRepository.save(post);
    await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: saved.id,
      action: ForumModerationAction.SUBMIT,
      actor,
      reason: 'Bài viết mới đang chờ duyệt thủ công',
      metadata: { mode: 'manual_review' },
    });
    this.realtimeEvents.emitForumEvent('forum:post.created', {
      id: saved.id,
      postId: saved.id,
      status: saved.status,
      topicId: saved.forumTopicId,
    }, {
      management: true,
      public: false,
      postRoom: false,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, post: saved };
  }

  async createComment(postId: string, dto: CreateForumCommentDto, actor: AuthenticatedUser) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post || post.status !== ForumContentStatus.PUBLISHED) {
      throw new NotFoundException('Không tìm thấy bài viết đang hiển thị');
    }
    if (!post.commentable) {
      throw new ForbiddenException('Bài viết này đã khóa bình luận');
    }

    const authorRole = this.resolveAuthorRole(actor);
    const comment = this.commentRepository.create({
      postId,
      parentId: dto.parentId ?? null,
      author: actor.name ?? actor.email ?? `User ${actor.id}`,
      authorId: actor.id,
      authorRole,
      messageType: dto.messageType ?? 'text',
      content: dto.content,
      isDoctorAnswer: authorRole === ForumAuthorRole.DOCTOR,
      status: ForumContentStatus.PUBLISHED,
      moderationReason: null,
    });

    const saved = await this.commentRepository.save(comment);
    this.realtimeEvents.emitForumEvent('forum:comment.created', {
      id: saved.id,
      postId,
      status: saved.status,
      isDoctorAnswer: Boolean(saved.isDoctorAnswer),
    }, {
      management: true,
      public: saved.status === ForumContentStatus.PUBLISHED,
      postRoom: saved.status === ForumContentStatus.PUBLISHED,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, comment: saved };
  }

  async createReport(dto: CreateContentReportDto, actor: AuthenticatedUser) {
    await this.ensureReportTargetExists(dto.targetType, dto.targetId);
    const report = this.reportRepository.create({
      reporterId: actor.id,
      reporterRole: this.isStaffActor(actor) ? ReportRole.STAFF : ReportRole.USER,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      status: ContentReportStatus.PENDING,
      handlerId: null,
      handler: null,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
      resolutionAction: null,
    });
    const saved = await this.reportRepository.save(report);
    this.realtimeEvents.emitForumEvent('forum:report.created', {
      id: saved.id,
      targetType: saved.targetType,
      targetId: saved.targetId,
    }, {
      management: true,
      public: false,
      postRoom: false,
    });
    return saved;
  }

  async findReports(query: ForumReportQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [data, total] = await this.reportRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async moderatePost(id: string, dto: ModerateForumContentDto, actor: AuthenticatedUser) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    this.applyPostAction(post, dto.action, actor, dto.reason ?? null);
    const saved = await this.postRepository.save(post);
    await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: id,
      action: dto.action,
      actor,
      reason: dto.reason ?? null,
    });
    this.realtimeEvents.emitForumEvent('forum:post.moderated', {
      id: saved.id,
      postId: saved.id,
      action: dto.action,
      status: saved.status,
    }, {
      management: true,
      public: this.shouldNotifyPublicModeration(saved.status),
      postRoom: this.shouldNotifyPublicModeration(saved.status),
    });
    return saved;
  }

  async moderateComment(id: string, dto: ModerateForumContentDto, actor: AuthenticatedUser) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Không tìm thấy bình luận');

    this.applyCommentAction(comment, dto.action, actor, dto.reason ?? null);
    const saved = await this.commentRepository.save(comment);
    await this.writeModerationLog({
      targetType: ForumTargetType.COMMENT,
      targetId: id,
      action: dto.action,
      actor,
      reason: dto.reason ?? null,
    });
    this.realtimeEvents.emitForumEvent('forum:comment.moderated', {
      id: saved.id,
      postId: saved.postId,
      action: dto.action,
      status: saved.status,
    }, {
      management: true,
      public: this.shouldNotifyPublicModeration(saved.status),
      postRoom: this.shouldNotifyPublicModeration(saved.status),
    });
    return saved;
  }

  async resolveReport(id: string, dto: ResolveContentReportDto, actor: AuthenticatedUser) {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy report');

    if (
      [ForumModerationAction.APPROVE, ForumModerationAction.HIDE, ForumModerationAction.REJECT, ForumModerationAction.DELETE]
        .includes(dto.action)
    ) {
      await this.applyReportTargetAction(report, dto.action, actor, dto.note ?? null);
    }

    report.status = ContentReportStatus.RESOLVED;
    report.handlerId = actor.id;
    report.resolvedBy = actor.id;
    report.resolvedAt = new Date();
    report.resolutionAction = dto.action;
    report.resolutionNote = dto.note ?? null;

    const saved = await this.reportRepository.save(report);
    await this.writeModerationLog({
      targetType: report.targetType,
      targetId: report.targetId,
      action: ForumModerationAction.RESOLVE_REPORT,
      actor,
      reason: dto.note ?? null,
      metadata: { reportId: report.id, resolutionAction: dto.action },
    });
    this.realtimeEvents.emitForumEvent('forum:report.resolved', {
      id: saved.id,
      targetType: saved.targetType,
      targetId: saved.targetId,
      action: dto.action,
    }, {
      management: true,
      public: false,
      postRoom: false,
    });
    return saved;
  }

  private async findPosts(query: ForumPostQueryDto, management: boolean) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const builder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.forumTopic', 'topic')
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (!management) {
      builder.andWhere('post.status = :status', { status: ForumContentStatus.PUBLISHED });
    } else if (query.status) {
      builder.andWhere('post.status = :status', { status: query.status });
    }

    if (query.category) builder.andWhere('post.category = :category', { category: query.category });
    if (query.topicId) builder.andWhere('post.forumTopicId = :topicId', { topicId: query.topicId });
    if (query.search) {
      builder.andWhere(new Brackets((qb) => {
        qb.where('post.title LIKE :search', { search: `%${query.search}%` })
          .orWhere('post.content LIKE :search', { search: `%${query.search}%` });
      }));
    }

    const [data, total] = await builder.getManyAndCount();
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, data, total, page, limit };
  }

  private async findTopicById(id: string) {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề');
    return topic;
  }

  private async findActiveTopicById(id: string) {
    const topic = await this.topicRepository.findOne({
      where: { id, status: ActiveStatus.ACTIVE },
    });
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề đang hoạt động');
    return topic;
  }

  private applyPostAction(
    post: ForumPost,
    action: ForumModerationAction,
    actor: AuthenticatedUser,
    reason: string | null,
  ) {
    const now = new Date();
    post.moderatedBy = actor.id;
    post.moderatedAt = now;
    post.moderationReason = reason;

    switch (action) {
      case ForumModerationAction.APPROVE:
        post.status = ForumContentStatus.PUBLISHED;
        post.approvedBy = actor.id;
        post.approvedAt = now;
        break;
      case ForumModerationAction.HIDE:
        post.status = ForumContentStatus.HIDDEN;
        break;
      case ForumModerationAction.REJECT:
        post.status = ForumContentStatus.REJECTED;
        break;
      case ForumModerationAction.DELETE:
        post.status = ForumContentStatus.DELETED;
        post.deletedAt = now;
        break;
      case ForumModerationAction.LOCK_COMMENTS:
        post.commentable = false;
        break;
      case ForumModerationAction.UNLOCK_COMMENTS:
        post.commentable = true;
        break;
      case ForumModerationAction.PIN:
        post.isPinned = true;
        break;
      case ForumModerationAction.UNPIN:
        post.isPinned = false;
        break;
      case ForumModerationAction.FEATURE:
        post.isFeatured = true;
        break;
      case ForumModerationAction.UNFEATURE:
        post.isFeatured = false;
        break;
      default:
        throw new BadRequestException('Action không hỗ trợ cho bài viết');
    }
  }

  private applyCommentAction(
    comment: ForumComment,
    action: ForumModerationAction,
    actor: AuthenticatedUser,
    reason: string | null,
  ) {
    const now = new Date();
    comment.moderatedBy = actor.id;
    comment.moderatedAt = now;
    comment.moderationReason = reason;

    switch (action) {
      case ForumModerationAction.APPROVE:
        comment.status = ForumContentStatus.PUBLISHED;
        break;
      case ForumModerationAction.HIDE:
        comment.status = ForumContentStatus.HIDDEN;
        break;
      case ForumModerationAction.REJECT:
        comment.status = ForumContentStatus.REJECTED;
        break;
      case ForumModerationAction.DELETE:
        comment.status = ForumContentStatus.DELETED;
        comment.deletedAt = now;
        break;
      default:
        throw new BadRequestException('Action không hỗ trợ cho bình luận');
    }
  }

  private async applyReportTargetAction(
    report: ContentReport,
    action: ForumModerationAction,
    actor: AuthenticatedUser,
    reason: string | null,
  ) {
    if (report.targetType === ForumTargetType.POST) {
      await this.moderatePost(report.targetId, { action, reason }, actor);
      return;
    }
    await this.moderateComment(report.targetId, { action, reason }, actor);
  }

  private async ensureReportTargetExists(targetType: ForumTargetType, targetId: string) {
    const exists = targetType === ForumTargetType.POST
      ? await this.postRepository.exist({ where: { id: targetId } })
      : await this.commentRepository.exist({ where: { id: targetId } });
    if (!exists) throw new NotFoundException('Không tìm thấy nội dung cần report');
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
    return Boolean(actor.employeeCode || actor.activeFacilityId || actor.roles.length);
  }

  private async writeModerationLog(input: {
    targetType: ForumTargetType;
    targetId: string;
    action: ForumModerationAction;
    actor: AuthenticatedUser;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const log = this.moderationLogRepository.create({
      targetType: input.targetType,
      targetId: input.targetId,
      action: input.action,
      actorId: input.actor.id,
      actorRole: this.resolveAuthorRole(input.actor),
      reason: input.reason ?? null,
      metadata: input.metadata ?? null,
    });
    return this.moderationLogRepository.save(log);
  }

  private shouldNotifyPublicModeration(status: ForumContentStatus): boolean {
    return [
      ForumContentStatus.PUBLISHED,
      ForumContentStatus.HIDDEN,
      ForumContentStatus.DELETED,
    ].includes(status);
  }

  private async createUniqueTopicSlug(title: string, currentId?: string) {
    const baseSlug = this.slugify(title);
    const existing = await this.topicRepository.findOne({ where: { slug: baseSlug } });
    if (!existing || existing.id === currentId) return baseSlug;
    return `${baseSlug}-${Date.now()}`;
  }

  private async createUniquePostSlug(title: string) {
    const baseSlug = this.slugify(title);
    const exists = await this.postRepository.exist({ where: { slug: baseSlug } });
    return exists ? `${baseSlug}-${Date.now()}` : baseSlug;
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || `forum-${Date.now()}`;
  }
}
