import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentReport } from '../../database/entities/content-report.entity';
import { ForumCategoryMetadata } from '../../database/entities/forum-category-metadata.entity';
import { ForumComment } from '../../database/entities/forum-comment.entity';
import { ForumModerationLog } from '../../database/entities/forum-moderation-log.entity';
import { ForumPost } from '../../database/entities/forum-post.entity';
import { ForumTopic } from '../../database/entities/forum-topic.entity';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
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
    ]),
    AuthModule,
    RealtimeModule,
  ],
  controllers: [PublicForumsController, ManagementForumsController],
  providers: [ForumsService],
  exports: [ForumsService],
})
export class ForumsModule {}
