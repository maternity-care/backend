import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateContentReportDto } from './dto/requests/create-content-report.dto';
import { CreateForumCommentDto } from './dto/requests/create-forum-comment.dto';
import { CreateForumPostDto } from './dto/requests/create-forum-post.dto';
import { ForumPostQueryDto } from './dto/requests/forum-query.dto';
import { UpdateForumCommentDto } from './dto/requests/update-forum-comment.dto';
import { UpdateForumPostDto } from './dto/requests/update-forum-post.dto';
import { ForumReportsService } from './forum-reports.service';
import { ForumsService } from './forums.service';

@ApiTags('Public - Forums')
@Controller('forums')
export class PublicForumsController {
  constructor(
    private readonly forumsService: ForumsService,
    private readonly forumReportsService: ForumReportsService,
  ) {}

  @Get('disclaimer')
  @ApiOperation({ summary: 'Get medical content disclaimer' })
  getDisclaimer() {
    return { message: 'Thành công', data: this.forumsService.getDisclaimer() };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List forum categories' })
  async getCategories() {
    return { message: 'Thành công', data: await this.forumsService.getCategories() };
  }

  @Get('topics')
  @ApiOperation({ summary: 'List active forum topics' })
  async getTopics() {
    return { message: 'Thành công', data: await this.forumsService.findActiveTopics() };
  }

  @Get('posts')
  @ApiOperation({ summary: 'List published forum posts' })
  async getPosts(@Query() query: ForumPostQueryDto) {
    return { message: 'Thành công', data: await this.forumsService.findPublicPosts(query) };
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get published forum post details' })
  async getPostDetails(@Param('id') id: string) {
    return { message: 'Thành công', data: await this.forumsService.findPostDetails(id) };
  }

  @Post('posts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a forum post for moderation' })
  async createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateForumPostDto,
  ) {
    return { message: 'Đã gửi bài viết', data: await this.forumsService.createPost(dto, user) };
  }

  @Patch('posts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update own pending/rejected forum post' })
  async updateOwnPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateForumPostDto,
  ) {
    return { message: 'Da cap nhat bai viet', data: await this.forumsService.updateOwnPost(id, dto, user) };
  }

  @Post('posts/:id/comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a forum comment' })
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateForumCommentDto,
  ) {
    return { message: 'Đã gửi bình luận', data: await this.forumsService.createComment(id, dto, user) };
  }

  @Patch('comments/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update own forum comment' })
  async updateOwnComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateForumCommentDto,
  ) {
    return { message: 'Da cap nhat binh luan', data: await this.forumsService.updateOwnComment(id, dto, user) };
  }

  @Post('reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Report a forum post or comment' })
  async createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContentReportDto,
  ) {
    return { message: 'Đã ghi nhận báo cáo', data: await this.forumReportsService.createReport(dto, user) };
  }
}
