import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import {
  ForumAuthorRole,
  ForumModerationAction,
  ForumTargetType,
} from '../../common/constants/forum.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import {
  ActiveStatus,
  ForumContentStatus,
} from '../../common/constants/status.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { getUserRoles } from '../../common/helpers/auth.helper';
import { ContentReport } from '../../database/entities/content-report.entity';
import { ForumCategoryMetadata } from '../../database/entities/forum-category-metadata.entity';
import { ForumComment } from '../../database/entities/forum-comment.entity';
import { ForumModerationLog } from '../../database/entities/forum-moderation-log.entity';
import { ForumPost } from '../../database/entities/forum-post.entity';
import { ForumTopic } from '../../database/entities/forum-topic.entity';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { CreateForumCommentDto } from './dto/requests/create-forum-comment.dto';
import { CreateForumPostDto } from './dto/requests/create-forum-post.dto';
import { CreateForumTopicDto } from './dto/requests/create-forum-topic.dto';
import { ForumPostQueryDto } from './dto/requests/forum-query.dto';
import {
  CreateManagementForumPostDto,
  UpdateManagementForumPostDto,
} from './dto/requests/management-forum-post.dto';
import {
  ModerateForumContentDto,
} from './dto/requests/moderate-forum-content.dto';
import { UpdateForumCommentDto } from './dto/requests/update-forum-comment.dto';
import { UpdateForumPostDto } from './dto/requests/update-forum-post.dto';
import { UpdateForumTopicDto } from './dto/requests/update-forum-topic.dto';
import { ForumNotificationsService } from './forum-notifications.service';

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
    private readonly forumNotifications: ForumNotificationsService,
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
      where: management ? { postId: id } : { postId: id, status: ForumContentStatus.PUBLISHED },
      order: { isDoctorAnswer: 'DESC', createdAt: 'ASC' },
    });

    const [postMetrics] = await this.decoratePostsWithMetrics([post]);
    const commentMetrics = await this.getReportCountMap(
      ForumTargetType.COMMENT,
      comments.map(comment => comment.id),
    );
    const commentsWithMetrics = comments.map(comment => ({
      ...comment,
      reportCount: commentMetrics.get(comment.id) ?? 0,
    }));
    const logs = await this.moderationLogRepository.find({
      where: [
        { targetType: ForumTargetType.POST, targetId: id },
        ...comments.map(comment => ({ targetType: ForumTargetType.COMMENT, targetId: comment.id })),
      ],
      order: { createdAt: 'ASC' },
    });

    return {
      medicalDisclaimer: MEDICAL_DISCLAIMER,
      post: postMetrics,
      comments: commentsWithMetrics,
      logs,
    };
  }

  async createPost(dto: CreateForumPostDto, actor: AuthenticatedUser) {
    const topic = await this.findActiveTopicById(dto.topicId);
    const authorRole = this.resolveAuthorRole(actor);
    const status = this.canAutoPublishForumContent(actor)
      ? ForumContentStatus.PUBLISHED
      : ForumContentStatus.PENDING;
    const now = new Date();

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
      approvedBy: status === ForumContentStatus.PUBLISHED ? actor.id : null,
      approvedAt: status === ForumContentStatus.PUBLISHED ? now : null,
      moderatedBy: status === ForumContentStatus.PUBLISHED ? actor.id : null,
      moderatedAt: status === ForumContentStatus.PUBLISHED ? now : null,
      moderationReason: status === ForumContentStatus.PUBLISHED ? 'Auto-published by staff role' : null,
    });

    const saved = await this.postRepository.save(post);
    const moderationLog = await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: saved.id,
      action: status === ForumContentStatus.PUBLISHED
        ? ForumModerationAction.APPROVE
        : ForumModerationAction.SUBMIT,
      actor,
      reason: 'Bài viết mới đang chờ duyệt thủ công',
      metadata: { mode: status === ForumContentStatus.PUBLISHED ? 'auto_publish' : 'manual_review' },
    });
    if (saved.status === ForumContentStatus.PENDING) {
      await this.forumNotifications.notifyPostSubmitted(saved, actor);
    }
    this.realtimeEvents.emitForumEvent(
      'forum:post.created',
      {
        id: saved.id,
        postId: saved.id,
        status: saved.status,
        topicId: saved.forumTopicId,
      },
      {
        management: true,
        public: saved.status === ForumContentStatus.PUBLISHED,
        postRoom: saved.status === ForumContentStatus.PUBLISHED,
      },
    );
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, post: saved };
  }

  async createManagementPost(dto: CreateManagementForumPostDto, actor: AuthenticatedUser) {
    const topic = await this.findActiveTopicById(dto.topicId);
    const status = dto.status ?? ForumContentStatus.PUBLISHED;
    if (status === ForumContentStatus.DELETED) {
      throw new BadRequestException('Khong the tao bai viet o trang thai deleted');
    }

    const now = new Date();
    const authorRole = this.resolveAuthorRole(actor);
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
      commentable: dto.commentable ?? true,
      isPinned: dto.isPinned ?? false,
      isFeatured: dto.isFeatured ?? false,
      approvedBy: status === ForumContentStatus.PUBLISHED ? actor.id : null,
      approvedAt: status === ForumContentStatus.PUBLISHED ? now : null,
      moderatedBy: actor.id,
      moderatedAt: now,
      moderationReason: dto.moderationReason ?? null,
      deletedAt: null,
    });

    const saved = await this.postRepository.save(post);
    await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: saved.id,
      action: this.resolveManagementPostLogAction(status),
      actor,
      reason: dto.moderationReason ?? null,
      metadata: { mode: 'management_create', status },
    });
    this.realtimeEvents.emitForumEvent('forum:post.created', {
      id: saved.id,
      postId: saved.id,
      status: saved.status,
      topicId: saved.forumTopicId,
      management: true,
    }, {
      management: true,
      public: saved.status === ForumContentStatus.PUBLISHED,
      postRoom: saved.status === ForumContentStatus.PUBLISHED,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, post: saved };
  }

  async updateManagementPost(
    id: string,
    dto: UpdateManagementForumPostDto,
    actor: AuthenticatedUser,
  ) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Khong tim thay bai viet');
    if (dto.status === ForumContentStatus.DELETED) {
      throw new BadRequestException('Dung API DELETE de xoa cung bai viet');
    }

    const oldStatus = post.status;
    const now = new Date();

    if (dto.topicId !== undefined && dto.topicId !== post.forumTopicId) {
      const topic = await this.findActiveTopicById(dto.topicId);
      post.forumTopicId = topic.id;
      post.category = topic.category;
    }
    if (dto.title !== undefined && dto.title !== post.title) {
      post.title = dto.title;
      post.slug = await this.createUniquePostSlug(dto.title, id);
    }
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.coverImageUrl !== undefined) post.coverImageUrl = dto.coverImageUrl ?? null;
    if (dto.commentable !== undefined) post.commentable = dto.commentable;
    if (dto.isPinned !== undefined) post.isPinned = dto.isPinned;
    if (dto.isFeatured !== undefined) post.isFeatured = dto.isFeatured;

    if (dto.status !== undefined) {
      post.status = dto.status;
      post.moderatedBy = actor.id;
      post.moderatedAt = now;
      post.moderationReason = dto.moderationReason ?? post.moderationReason;
      if (dto.status === ForumContentStatus.PUBLISHED && oldStatus !== ForumContentStatus.PUBLISHED) {
        post.approvedBy = actor.id;
        post.approvedAt = now;
      }
      if (oldStatus === ForumContentStatus.REJECTED && dto.status === ForumContentStatus.PUBLISHED) {
        post.approvedBy = actor.id;
        post.approvedAt = now;
      }
    } else if (dto.moderationReason !== undefined) {
      post.moderationReason = dto.moderationReason;
    }

    const saved = await this.postRepository.save(post);
    await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: saved.id,
      action: this.resolveManagementPostLogAction(dto.status),
      actor,
      reason: dto.moderationReason ?? null,
      metadata: { mode: 'management_update', fields: Object.keys(dto) },
    });
    this.realtimeEvents.emitForumEvent('forum:post.updated', {
      id: saved.id,
      postId: saved.id,
      status: saved.status,
      topicId: saved.forumTopicId,
    }, {
      management: true,
      public: saved.status === ForumContentStatus.PUBLISHED || oldStatus === ForumContentStatus.PUBLISHED,
      postRoom: saved.status === ForumContentStatus.PUBLISHED || oldStatus === ForumContentStatus.PUBLISHED,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, post: saved };
  }

  async updateOwnPost(id: string, dto: UpdateForumPostDto, actor: AuthenticatedUser) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post || post.authorId !== actor.id) {
      throw new NotFoundException('Khong tim thay bai viet cua ban');
    }
    if (![ForumContentStatus.PENDING, ForumContentStatus.REJECTED].includes(post.status)) {
      throw new BadRequestException('Chi co the sua bai dang cho duyet hoac bi tu choi');
    }

    if (dto.topicId !== undefined && dto.topicId !== post.forumTopicId) {
      const topic = await this.findActiveTopicById(dto.topicId);
      post.forumTopicId = topic.id;
      post.category = topic.category;
    }
    if (dto.title !== undefined && dto.title !== post.title) {
      post.title = dto.title;
      post.slug = await this.createUniquePostSlug(dto.title, id);
    }
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.coverImageUrl !== undefined) post.coverImageUrl = dto.coverImageUrl ?? null;

    const autoPublish = this.canAutoPublishForumContent(actor);
    post.status = autoPublish ? ForumContentStatus.PUBLISHED : ForumContentStatus.PENDING;
    post.moderationReason = autoPublish ? 'Auto-published by staff role' : null;
    post.moderatedBy = autoPublish ? actor.id : null;
    post.moderatedAt = autoPublish ? new Date() : null;
    post.approvedBy = autoPublish ? actor.id : null;
    post.approvedAt = autoPublish ? new Date() : null;

    const saved = await this.postRepository.save(post);
    await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: saved.id,
      action: autoPublish ? ForumModerationAction.APPROVE : ForumModerationAction.SUBMIT,
      actor,
      reason: autoPublish ? 'Auto-published after edit' : 'User updated rejected/pending post',
      metadata: { mode: 'owner_update', fields: Object.keys(dto) },
    });
    this.realtimeEvents.emitForumEvent('forum:post.updated', {
      id: saved.id,
      postId: saved.id,
      status: saved.status,
      topicId: saved.forumTopicId,
    }, {
      management: true,
      public: saved.status === ForumContentStatus.PUBLISHED,
      postRoom: saved.status === ForumContentStatus.PUBLISHED,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, post: saved };
  }

  async updateOwnComment(id: string, dto: UpdateForumCommentDto, actor: AuthenticatedUser) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment || comment.authorId !== actor.id) {
      throw new NotFoundException('Khong tim thay binh luan cua ban');
    }
    if (dto.content !== undefined) comment.content = dto.content;
    if (dto.messageType !== undefined) comment.messageType = dto.messageType;

    const autoPublish = this.canAutoPublishForumContent(actor);
    comment.status = autoPublish ? ForumContentStatus.PUBLISHED : comment.status;
    comment.moderationReason = autoPublish ? 'Auto-published by staff role' : comment.moderationReason;
    comment.moderatedBy = autoPublish ? actor.id : comment.moderatedBy;
    comment.moderatedAt = autoPublish ? new Date() : comment.moderatedAt;

    const saved = await this.commentRepository.save(comment);
    this.realtimeEvents.emitForumEvent('forum:comment.updated', {
      id: saved.id,
      postId: saved.postId,
      status: saved.status,
    }, {
      management: true,
      public: saved.status === ForumContentStatus.PUBLISHED,
      postRoom: saved.status === ForumContentStatus.PUBLISHED,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, comment: saved };
  }

  async updateManagementComment(id: string, dto: UpdateForumCommentDto, actor: AuthenticatedUser) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Khong tim thay binh luan');
    if (dto.content !== undefined) comment.content = dto.content;
    if (dto.messageType !== undefined) comment.messageType = dto.messageType;
    comment.status = ForumContentStatus.PUBLISHED;
    comment.moderatedBy = actor.id;
    comment.moderatedAt = new Date();
    comment.moderationReason = 'Updated from management';

    const saved = await this.commentRepository.save(comment);
    await this.writeModerationLog({
      targetType: ForumTargetType.COMMENT,
      targetId: saved.id,
      action: ForumModerationAction.APPROVE,
      actor,
      reason: 'Updated from management',
      metadata: { mode: 'management_update', fields: Object.keys(dto) },
    });
    this.realtimeEvents.emitForumEvent('forum:comment.updated', {
      id: saved.id,
      postId: saved.postId,
      status: saved.status,
    }, {
      management: true,
      public: true,
      postRoom: true,
    });
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, comment: saved };
  }

  async hardDeletePost(id: string, actor: AuthenticatedUser, reason?: string | null) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Khong tim thay bai viet');

    await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: id,
      action: ForumModerationAction.DELETE,
      actor,
      reason: reason ?? null,
      metadata: { mode: 'hard_delete' },
    });
    await this.commentRepository.delete({ postId: id });
    await this.postRepository.delete(id);
    this.realtimeEvents.emitForumEvent('forum:post.deleted', {
      id,
      postId: id,
      hardDeleted: true,
    }, {
      management: true,
      public: true,
      postRoom: true,
    });
    return { action: 'hard_deleted', id };
  }

  async hardDeleteComment(id: string, actor: AuthenticatedUser, reason?: string | null) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Khong tim thay binh luan');
    const ids = await this.findCommentTreeIds(id);

    await this.writeModerationLog({
      targetType: ForumTargetType.COMMENT,
      targetId: id,
      action: ForumModerationAction.DELETE,
      actor,
      reason: reason ?? null,
      metadata: { mode: 'hard_delete', deletedIds: ids },
    });
    await this.commentRepository
      .createQueryBuilder()
      .delete()
      .from(ForumComment)
      .where('id IN (:...ids)', { ids })
      .execute();
    this.realtimeEvents.emitForumEvent('forum:comment.deleted', {
      id,
      postId: comment.postId,
      hardDeleted: true,
      deletedIds: ids,
    }, {
      management: true,
      public: true,
      postRoom: true,
    });
    return { action: 'hard_deleted', id, affectedCount: ids.length };
  }

  async createComment(postId: string, dto: CreateForumCommentDto, actor: AuthenticatedUser) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post || post.status !== ForumContentStatus.PUBLISHED) {
      throw new NotFoundException('Không tìm thấy bài viết đang hiển thị');
    }
    if (!post.commentable) {
      throw new ForbiddenException('Bài viết này đã khóa bình luận');
    }

    const parentComment = dto.parentId
      ? await this.commentRepository.findOne({
          where: { id: dto.parentId, postId, status: ForumContentStatus.PUBLISHED },
        })
      : null;
    if (dto.parentId && !parentComment) {
      throw new BadRequestException(
        'Bình luận cha không thuộc bài viết này hoặc không còn hiển thị',
      );
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
    await this.forumNotifications.notifyCommentCreated(post, saved, parentComment, actor);
    this.realtimeEvents.emitForumEvent(
      'forum:comment.created',
      {
        id: saved.id,
        postId,
        status: saved.status,
        isDoctorAnswer: Boolean(saved.isDoctorAnswer),
      },
      {
        management: true,
        public: saved.status === ForumContentStatus.PUBLISHED,
        postRoom: saved.status === ForumContentStatus.PUBLISHED,
      },
    );
    return { medicalDisclaimer: MEDICAL_DISCLAIMER, comment: saved };
  }

  async moderatePost(id: string, dto: ModerateForumContentDto, actor: AuthenticatedUser) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    if (dto.action === ForumModerationAction.DELETE) {
      return this.hardDeletePost(id, actor, dto.reason ?? null);
    }
    this.applyPostAction(post, dto.action, actor, dto.reason ?? null);
    const saved = await this.postRepository.save(post);
    const moderationLog = await this.writeModerationLog({
      targetType: ForumTargetType.POST,
      targetId: id,
      action: dto.action,
      actor,
      reason: dto.reason ?? null,
    });
    await this.forumNotifications.notifyPostModerated(saved, dto.action, actor, moderationLog.id);
    this.realtimeEvents.emitForumEvent(
      'forum:post.moderated',
      {
        id: saved.id,
        postId: saved.id,
        action: dto.action,
        status: saved.status,
      },
      {
        management: true,
        public: this.shouldNotifyPublicModeration(saved.status),
        postRoom: this.shouldNotifyPublicModeration(saved.status),
      },
    );
    return saved;
  }

  async moderateComment(id: string, dto: ModerateForumContentDto, actor: AuthenticatedUser) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Không tìm thấy bình luận');

    if (dto.action === ForumModerationAction.DELETE) {
      return this.hardDeleteComment(id, actor, dto.reason ?? null);
    }
    this.applyCommentAction(comment, dto.action, actor, dto.reason ?? null);
    const saved = await this.commentRepository.save(comment);
    const moderationLog = await this.writeModerationLog({
      targetType: ForumTargetType.COMMENT,
      targetId: id,
      action: dto.action,
      actor,
      reason: dto.reason ?? null,
    });
    await this.forumNotifications.notifyCommentModerated(
      saved,
      dto.action,
      actor,
      moderationLog.id,
    );
    this.realtimeEvents.emitForumEvent(
      'forum:comment.moderated',
      {
        id: saved.id,
        postId: saved.postId,
        action: dto.action,
        status: saved.status,
      },
      {
        management: true,
        public: this.shouldNotifyPublicModeration(saved.status),
        postRoom: this.shouldNotifyPublicModeration(saved.status),
      },
    );
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
    if (query.authorId) builder.andWhere('post.authorId = :authorId', { authorId: query.authorId });
    if (query.authorRole)
      builder.andWhere('post.authorRole = :authorRole', { authorRole: query.authorRole });
    if (query.search) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('post.title LIKE :search', { search: `%${query.search}%` }).orWhere(
            'post.content LIKE :search',
            { search: `%${query.search}%` },
          );
        }),
      );
    }

    const [data, total] = await builder.getManyAndCount();
    return {
      medicalDisclaimer: MEDICAL_DISCLAIMER,
      data: await this.decoratePostsWithMetrics(data),
      total,
      page,
      limit,
    };
  }

  // lấy số lượng comment và report cho mỗi bài viết,
  // trả về mảng bài viết với các trường commentCount, reportCount, interactionCount
  private async decoratePostsWithMetrics(posts: ForumPost[]) {
    if (posts.length === 0) return [];
    const postIds = posts.map(post => post.id);
    const commentCounts = await this.getCommentCountMap(postIds);
    const reportCounts = await this.getReportCountMap(ForumTargetType.POST, postIds);

    return posts.map(post => {
      const commentCount = commentCounts.get(post.id) ?? 0;
      const reportCount = reportCounts.get(post.id) ?? 0;
      return {
        ...post,
        commentCount,
        reportCount,
        interactionCount: commentCount + reportCount,
      };
    });
  }

  private async getCommentCountMap(postIds: string[]) {
    const counts = new Map<string, number>();
    if (postIds.length === 0) return counts;
    const rows = await this.commentRepository
      .createQueryBuilder('comment')
      .select('comment.postId', 'postId')
      .addSelect('COUNT(comment.id)', 'count')
      .where('comment.postId IN (:...postIds)', { postIds })
      .andWhere('comment.status != :deletedStatus', { deletedStatus: ForumContentStatus.DELETED })
      .groupBy('comment.postId')
      .getRawMany<{ postId: string; count: string }>();
    rows.forEach(row => counts.set(String(row.postId), Number(row.count)));
    return counts;
  }

  private async getReportCountMap(targetType: ForumTargetType, targetIds: string[]) {
    const counts = new Map<string, number>();
    if (targetIds.length === 0) return counts;
    const rows = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.targetId', 'targetId')
      .addSelect('COUNT(report.id)', 'count')
      .where('report.targetType = :targetType', { targetType })
      .andWhere('report.targetId IN (:...targetIds)', { targetIds })
      .groupBy('report.targetId')
      .getRawMany<{ targetId: string; count: string }>();
    rows.forEach(row => counts.set(String(row.targetId), Number(row.count)));
    return counts;
  }

  private async findCommentTreeIds(rootId: string) {
    const ids = [rootId];
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await this.commentRepository.find({
        where: { parentId: In(frontier) },
        select: { id: true },
      });
      frontier = children.map(child => child.id).filter(id => !ids.includes(id));
      ids.push(...frontier);
    }

    return ids;
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
        throw new BadRequestException('Dung hardDeletePost de xoa cung bai viet');
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
        throw new BadRequestException('Dung hardDeleteComment de xoa cung binh luan');
      default:
        throw new BadRequestException('Action không hỗ trợ cho bình luận');
    }
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

  private canAutoPublishForumContent(actor: AuthenticatedUser): boolean {
    return this.isStaffActor(actor);
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
    ].includes(status);
  }

  private resolveManagementPostLogAction(status?: ForumContentStatus): ForumModerationAction {
    switch (status) {
      case ForumContentStatus.PUBLISHED:
        return ForumModerationAction.APPROVE;
      case ForumContentStatus.HIDDEN:
        return ForumModerationAction.HIDE;
      case ForumContentStatus.REJECTED:
        return ForumModerationAction.REJECT;
      case ForumContentStatus.DELETED:
        return ForumModerationAction.DELETE;
      default:
        return ForumModerationAction.SUBMIT;
    }
  }

  private async createUniqueTopicSlug(title: string, currentId?: string) {
    const baseSlug = this.slugify(title);
    const existing = await this.topicRepository.findOne({ where: { slug: baseSlug } });
    if (!existing || existing.id === currentId) return baseSlug;
    return `${baseSlug}-${Date.now()}`;
  }

  private async createUniquePostSlug(title: string, currentId?: string) {
    const baseSlug = this.slugify(title);
    const existing = await this.postRepository.findOne({ where: { slug: baseSlug } });
    if (!existing || existing.id === currentId) return baseSlug;
    return `${baseSlug}-${Date.now()}`;
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
