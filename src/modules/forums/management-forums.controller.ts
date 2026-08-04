import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateForumTopicDto } from './dto/requests/create-forum-topic.dto';
import { ForumPostQueryDto, ForumReportQueryDto } from './dto/requests/forum-query.dto';
import {
  ModerateForumContentDto,
  ResolveContentReportDto,
} from './dto/requests/moderate-forum-content.dto';
import { UpdateForumTopicDto } from './dto/requests/update-forum-topic.dto';
import { ForumsService } from './forums.service';

@ApiTags('Management - Forums')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('management/forums')
export class ManagementForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Get('topics')
  // @Permissions(PermissionEnum.FORUM_VIEW)
  @ApiOperation({ summary: 'List forum topics' })
  async getTopics() {
    return { message: 'Thành công', data: await this.forumsService.findActiveTopics() };
  }

  @Post('topics')
  // @Permissions(PermissionEnum.FORUM_UPDATE)
  @ApiOperation({ summary: 'Create forum topic' })
  async createTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateForumTopicDto,
  ) {
    return { message: 'Đã tạo chủ đề', data: await this.forumsService.createTopic(dto, user) };
  }

  @Patch('topics/:id')
  // @Permissions(PermissionEnum.FORUM_UPDATE)
  @ApiOperation({ summary: 'Update forum topic' })
  async updateTopic(@Param('id') id: string, @Body() dto: UpdateForumTopicDto) {
    return { message: 'Đã cập nhật chủ đề', data: await this.forumsService.updateTopic(id, dto) };
  }

  @Get('posts')
  // @Permissions(PermissionEnum.FORUM_VIEW)
  @ApiOperation({ summary: 'List forum posts for moderation' })
  async getPosts(@Query() query: ForumPostQueryDto) {
    return { message: 'Thành công', data: await this.forumsService.findManagementPosts(query) };
  }

  @Get('posts/:id')
  // @Permissions(PermissionEnum.FORUM_VIEW)
  @ApiOperation({ summary: 'Get forum post details for moderation' })
  async getPostDetails(@Param('id') id: string) {
    return { message: 'Thành công', data: await this.forumsService.findPostDetails(id, true) };
  }

  @Patch('posts/:id/moderation')
  // @Permissions(PermissionEnum.FORUM_MODERATE)
  @ApiOperation({ summary: 'Moderate post: approve, hide, reject, delete, lock, pin, feature' })
  async moderatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateForumContentDto,
  ) {
    return { message: 'Đã xử lý bài viết', data: await this.forumsService.moderatePost(id, dto, user) };
  }

  @Patch('comments/:id/moderation')
  // @Permissions(PermissionEnum.FORUM_MODERATE)
  @ApiOperation({ summary: 'Moderate comment: approve, hide, reject, delete' })
  async moderateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateForumContentDto,
  ) {
    return { message: 'Đã xử lý bình luận', data: await this.forumsService.moderateComment(id, dto, user) };
  }

  @Get('reports')
  // @Permissions(PermissionEnum.FORUM_REPORT_VIEW)
  @ApiOperation({ summary: 'List content reports' })
  async getReports(@Query() query: ForumReportQueryDto) {
    return { message: 'Thành công', data: await this.forumsService.findReports(query) };
  }

  @Patch('reports/:id/resolve')
  // @Permissions(PermissionEnum.FORUM_REPORT_RESOLVE)
  @ApiOperation({ summary: 'Resolve content report' })
  async resolveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveContentReportDto,
  ) {
    return { message: 'Đã xử lý báo cáo', data: await this.forumsService.resolveReport(id, dto, user) };
  }
}
