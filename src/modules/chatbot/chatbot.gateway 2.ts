import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatbotService } from './chatbot.service';
import { ChatbotMessagePayload, StaffChatbotMessagePayload } from './chatbot.types';

@WebSocketGateway({
  namespace: 'chatbot',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatbotGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly claimTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly chatbotService: ChatbotService) {}

  handleConnection(client: Socket): void {
    if (this.getClientMode(client) === 'staff') {
      client.join('chatbot:staff');
      client.emit('chatbot:staff-queue', this.chatbotService.getStaffQueue());
      return;
    }

    const conversationId = this.getConversationId(client);
    const conversation = this.chatbotService.startConversation(conversationId);

    client.join(conversation.conversationId);
    client.emit('chatbot:conversation', conversation);
  }

  @SubscribeMessage('chatbot:message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatbotMessagePayload,
  ): void {
    const result = this.chatbotService.receiveUserMessage(payload);
    const conversation = result.conversation;

    client.join(conversation.conversationId);
    this.server.to(conversation.conversationId).emit('chatbot:typing', false);
    this.server.to(conversation.conversationId).emit('chatbot:conversation', conversation);

    if (result.shouldNotifyStaff) {
      this.server.to('chatbot:staff').emit('chatbot:staff-queue', this.chatbotService.getStaffQueue());
      this.server.to('chatbot:staff').emit('chatbot:handoff', conversation);
    }
  }

  @SubscribeMessage('chatbot:staff-join')
  handleStaffJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StaffChatbotMessagePayload,
  ): void {
    if (!payload.conversationId) return;

    const result = this.chatbotService.claimConversation(payload);
    client.join(payload.conversationId);
    client.emit('chatbot:conversation', result.conversation);
    this.server.to(payload.conversationId).emit('chatbot:conversation', result.conversation);
    this.server.to('chatbot:staff').emit('chatbot:staff-queue', this.chatbotService.getStaffQueue());

    if (result.claimExpiresAt) {
      this.scheduleClaimRelease(payload.conversationId);
    }
  }

  @SubscribeMessage('chatbot:staff-message')
  handleStaffMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StaffChatbotMessagePayload,
  ): void {
    if (!payload.conversationId) return;

    const conversation = this.chatbotService.receiveStaffMessage(payload);
    this.clearClaimTimer(conversation.conversationId);
    client.join(conversation.conversationId);
    this.server.to(conversation.conversationId).emit('chatbot:conversation', conversation);
    this.server.to('chatbot:staff').emit('chatbot:staff-queue', this.chatbotService.getStaffQueue());
  }

  @SubscribeMessage('chatbot:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: string; typing?: boolean },
  ): void {
    if (!payload.conversationId) return;

    client.to(payload.conversationId).emit('chatbot:typing', Boolean(payload.typing));
  }

  private getConversationId(client: Socket): string | undefined {
    const value = client.handshake.auth?.conversationId ?? client.handshake.query?.conversationId;
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private getClientMode(client: Socket): 'user' | 'staff' {
    return client.handshake.auth?.mode === 'staff' ? 'staff' : 'user';
  }

  private scheduleClaimRelease(conversationId: string): void {
    this.clearClaimTimer(conversationId);
    const timer = setTimeout(() => {
      const conversation = this.chatbotService.releaseClaimIfNoReply(conversationId);
      if (!conversation) return;

      this.server.to(conversationId).emit('chatbot:conversation', conversation);
      this.server.to('chatbot:staff').emit('chatbot:staff-queue', this.chatbotService.getStaffQueue());
      this.server.to('chatbot:staff').emit('chatbot:handoff', conversation);
      this.claimTimers.delete(conversationId);
    }, 5 * 60 * 1000);

    this.claimTimers.set(conversationId, timer);
  }

  private clearClaimTimer(conversationId: string): void {
    const timer = this.claimTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.claimTimers.delete(conversationId);
    }
  }
}
