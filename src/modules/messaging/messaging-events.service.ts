import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class MessagingEventsService {
  private readonly logger = new Logger(MessagingEventsService.name);
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitToStaff(event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(`Messages server is not ready for ${event}`);
      return;
    }

    this.server.to('messages:staff').emit(event, payload);
  }

  emitConversation(conversationId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(`Messages server is not ready for ${event}`);
      return;
    }

    this.server.to(`messages:conversation:${conversationId}`).emit(event, payload);
  }
}
