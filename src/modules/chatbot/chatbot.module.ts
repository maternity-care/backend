import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { ChatbotGateway } from './chatbot.gateway';
import { ChatbotService } from './chatbot.service';
import { GeminiChatbotService } from './gemini-chatbot.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage]), UploadsModule],
  providers: [ChatbotGateway, ChatbotService, GeminiChatbotService],
})
export class ChatbotModule {}
