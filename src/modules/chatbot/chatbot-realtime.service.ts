import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ChatbotConversationPayload } from './chatbot.types';

@Injectable()
export class ChatbotRealtimeService {
  private readonly logger = new Logger(ChatbotRealtimeService.name);
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitConversation(conversationId: string, conversation: ChatbotConversationPayload): void {
    if (!this.server) {
      this.logger.debug(`Chatbot server is not ready for conversation ${conversationId}`);
      return;
    }

    this.server.to(conversationId).emit('chatbot:conversation', conversation);
  }
}
