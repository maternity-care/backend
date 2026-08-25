import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MessagingChannelAccount } from '../messaging/entities/messaging-channel-account.entity';
import { MessagingConversation } from '../messaging/entities/messaging-conversation.entity';
import { MessagingCustomerIdentity } from '../messaging/entities/messaging-customer-identity.entity';
import { MessagingMessage } from '../messaging/entities/messaging-message.entity';
import { Staff } from '../staffs/entities/staff.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { ChatbotGateway } from './chatbot.gateway';
import { ChatbotRealtimeService } from './chatbot-realtime.service';
import { ChatbotService } from './chatbot.service';
import { GeminiChatbotService } from './gemini-chatbot.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => MessagingModule),
    TypeOrmModule.forFeature([MessagingChannelAccount, MessagingConversation, MessagingCustomerIdentity, MessagingMessage, Staff]),
    UploadsModule,
  ],
  providers: [ChatbotGateway, ChatbotRealtimeService, ChatbotService, GeminiChatbotService],
  exports: [ChatbotRealtimeService, ChatbotService, GeminiChatbotService],
})
export class ChatbotModule {}
