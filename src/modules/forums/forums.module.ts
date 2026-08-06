import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentReport } from '../../database/entities/content-report.entity';
import { ForumCategoryMetadata } from '../../database/entities/forum-category-metadata.entity';
import { ForumComment } from '../../database/entities/forum-comment.entity';
import { ForumModerationLog } from '../../database/entities/forum-moderation-log.entity';
import { ForumPost } from '../../database/entities/forum-post.entity';
import { ForumTopic } from '../../database/entities/forum-topic.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StaffPermission } from '../permissions/entities/staff-permission.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { Staff } from '../staffs/entities/staff.entity';
import { ForumNotificationsService } from './forum-notifications.service';
import { ForumsService } from './forums.service';
import { ManagementForumsController } from './management-forums.controller';
import { PublicForumsController } from './public-forums.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumTopic,
      ForumCategoryMetadata,
      ForumPost,
      ForumComment,
      ContentReport,
      ForumModerationLog,
      Staff,
      StaffPermission,
    ]),
    AuthModule,
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [PublicForumsController, ManagementForumsController],
  providers: [ForumsService, ForumNotificationsService],
  exports: [ForumsService],
})
export class ForumsModule {}
