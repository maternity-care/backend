import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForumTargetType } from '../../common/constants/forum.enum';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateForumTopicDto } from './dto/requests/create-forum-topic.dto';
import { ForumPostQueryDto, ForumReportQueryDto } from './dto/requests/forum-query.dto';
import {
  CreateManagementForumPostDto,
  UpdateManagementForumPostDto,
} from './dto/requests/management-forum-post.dto';
import {
  ModerateForumContentDto,
  ResolveContentReportDto,
} from './dto/requests/moderate-forum-content.dto';
import { UpdateForumTopicDto } from './dto/requests/update-forum-topic.dto';
import { UpdateForumCommentDto } from './dto/requests/update-forum-comment.dto';
import { ForumReportsService } from './forum-reports.service';
import { ForumsService } from './forums.service';

@ApiTags('Management - Forums')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MODERATOR, RoleEnum.STAFF, RoleEnum.DOCTOR)
@Controller('management/forums')
export class ManagementForumsController {
  constructor(
    private readonly forumsService: ForumsService,
    private readonly forumReportsService: ForumReportsService,
  ) {}

  @Get('topics')
  @Permissions(PermissionEnum.FORUM_VIEW)
  @ApiOperation({ summary: 'List forum topics' })
  async getTopics() {
    return { message: 'Thành công', data: await this.forumsService.findActiveTopics() };
  }

  @Post('topics')
  @Permissions(PermissionEnum.FORUM_UPDATE)
  @ApiOperation({ summary: 'Create forum topic' })
  async createTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateForumTopicDto,
  ) {
    return { message: 'Đã tạo chủ đề', data: await this.forumsService.createTopic(dto, user) };
  }

  @Patch('topics/:id')
  @Permissions(PermissionEnum.FORUM_UPDATE)
  @ApiOperation({ summary: 'Update forum topic' })
  async updateTopic(@Param('id') id: string, @Body() dto: UpdateForumTopicDto) {
    return { message: 'Đã cập nhật chủ đề', data: await this.forumsService.updateTopic(id, dto) };
  }

  @Get('posts')
  @Permissions(PermissionEnum.FORUM_VIEW)
  @ApiOperation({ summary: 'List forum posts for moderation' })
  async getPosts(@Query() query: ForumPostQueryDto) {
    return { message: 'Thành công', data: await this.forumsService.findManagementPosts(query) };
  }

  @Post('posts')
  @Permissions(PermissionEnum.FORUM_CREATE)
  @ApiOperation({ summary: 'Create forum post from management' })
  async createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManagementForumPostDto,
  ) {
    return { message: 'Đã tạo bài viết', data: await this.forumsService.createManagementPost(dto, user) };
  }

  @Get('posts/:id')
  @Permissions(PermissionEnum.FORUM_VIEW)
  @ApiOperation({ summary: 'Get forum post details for moderation' })
  async getPostDetails(@Param('id') id: string) {
    return { message: 'Thành công', data: await this.forumsService.findPostDetails(id, true) };
  }

  @Patch('posts/:id')
  @Permissions(PermissionEnum.FORUM_UPDATE)
  @ApiOperation({ summary: 'Update forum post from management' })
  async updatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateManagementForumPostDto,
  ) {
    return { message: 'Đã cập nhật bài viết', data: await this.forumsService.updateManagementPost(id, dto, user) };
  }

  @Delete('posts/:id')
  @Permissions(PermissionEnum.FORUM_DELETE)
  @ApiOperation({ summary: 'Hard delete forum post from management' })
  async deletePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return { message: 'Đã xóa bài viết', data: await this.forumsService.hardDeletePost(id, user, reason) };
  }

  @Patch('posts/:id/moderation')
  @Permissions(PermissionEnum.FORUM_MODERATE)
  @ApiOperation({ summary: 'Moderate post: approve, hide, reject, delete, lock, pin, feature' })
  async moderatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateForumContentDto,
  ) {
    return { message: 'Đã xử lý bài viết', data: await this.forumsService.moderatePost(id, dto, user) };
  }

  @Patch('comments/:id/moderation')
  @Permissions(PermissionEnum.FORUM_MODERATE)
  @ApiOperation({ summary: 'Moderate comment: approve, hide, reject, delete' })
  async moderateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateForumContentDto,
  ) {
    return { message: 'Đã xử lý bình luận', data: await this.forumsService.moderateComment(id, dto, user) };
  }

  @Patch('comments/:id')
  @Permissions(PermissionEnum.FORUM_UPDATE)
  @ApiOperation({ summary: 'Update forum comment from management' })
  async updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateForumCommentDto,
  ) {
    return { message: 'Đã cập nhật bình luận', data: await this.forumsService.updateManagementComment(id, dto, user) };
  }

  @Delete('comments/:id')
  @Permissions(PermissionEnum.FORUM_DELETE)
  @ApiOperation({ summary: 'Hard delete forum comment from management' })
  async deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return { message: 'Đã xóa bình luận', data: await this.forumsService.hardDeleteComment(id, user, reason) };
  }

  @Get('reports')
  @Permissions(PermissionEnum.FORUM_REPORT_VIEW)
  @ApiOperation({ summary: 'List content reports' })
  async getReports(@Query() query: ForumReportQueryDto) {
    return { message: 'Thành công', data: await this.forumReportsService.findReports(query) };
  }

  @Get('reports/groups')
  @Permissions(PermissionEnum.FORUM_REPORT_VIEW)
  @ApiOperation({ summary: 'List content reports grouped by reported content' })
  async getReportGroups(@Query() query: ForumReportQueryDto) {
    return { message: 'Thành công', data: await this.forumReportsService.findReportGroups(query) };
  }

  @Patch('reports/groups/:targetType/:targetId/resolve')
  @Permissions(PermissionEnum.FORUM_REPORT_RESOLVE)
  @ApiOperation({ summary: 'Resolve all reports of the same post/comment' })
  async resolveReportGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('targetType') targetType: ForumTargetType,
    @Param('targetId') targetId: string,
    @Body() dto: ResolveContentReportDto,
  ) {
    return {
      message: 'Đã xử lý nhóm báo cáo',
      data: await this.forumReportsService.resolveReportGroup(targetType, targetId, dto, user),
    };
  }

  @Patch('reports/:id/resolve')
  @Permissions(PermissionEnum.FORUM_REPORT_RESOLVE)
  @ApiOperation({ summary: 'Resolve content report' })
  async resolveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveContentReportDto,
  ) {
    return { message: 'Đã xử lý báo cáo', data: await this.forumReportsService.resolveReport(id, dto, user) };
  }
}
