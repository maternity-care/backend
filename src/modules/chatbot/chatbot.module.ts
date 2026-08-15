import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { AuthModule } from '../auth/auth.module';
import { Staff } from '../staffs/entities/staff.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { ChatbotGateway } from './chatbot.gateway';
import { ChatbotService } from './chatbot.service';
import { GeminiChatbotService } from './gemini-chatbot.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ChatConversation, ChatMessage, Staff]), UploadsModule],
  providers: [ChatbotGateway, ChatbotService, GeminiChatbotService],
})
export class ChatbotModule {}
