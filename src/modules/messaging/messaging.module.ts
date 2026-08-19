import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Staff } from '../staffs/entities/staff.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { MessagingChannelAccount } from './entities/messaging-channel-account.entity';
import { MessagingCustomerIdentity } from './entities/messaging-customer-identity.entity';
import { MessagingConversationTag } from './entities/messaging-conversation-tag.entity';
import { MessagingConversation } from './entities/messaging-conversation.entity';
import { MessagingMessage } from './entities/messaging-message.entity';
import { MessagingTag } from './entities/messaging-tag.entity';
import { FacebookWebhookController, MessagingController } from './messaging.controller';
import { MessagingEventsService } from './messaging-events.service';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';
import { FacebookPageRuntimeService } from './adapters/facebook-page-runtime.service';
import { ZaloPersonalRuntimeService } from './adapters/zalo-personal-runtime.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      MessagingChannelAccount,
      MessagingConversation,
      MessagingConversationTag,
      MessagingCustomerIdentity,
      MessagingMessage,
      MessagingTag,
      Appointment,
      Staff,
      User,
    ]),
  ],
  controllers: [MessagingController, FacebookWebhookController],
  providers: [
    MessagingService,
    MessagingEventsService,
    MessagingGateway,
    FacebookPageRuntimeService,
    ZaloPersonalRuntimeService,
  ],
})
export class MessagingModule {}
