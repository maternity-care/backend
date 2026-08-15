import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { RoleEnum } from '../../common/constants/role.enum';
import { AccountStatus } from '../../common/constants/status.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Staff } from '../staffs/entities/staff.entity';
import { ChatbotService } from './chatbot.service';
import {
  ChatbotConversationPayload,
  ChatbotHistoryPayload,
  ChatbotMessagePayload,
  StaffChatbotMessagePayload,
} from './chatbot.types';

@WebSocketGateway({
  namespace: 'chatbot',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly claimTimers = new Map<string, NodeJS.Timeout>();
  private readonly userIdleTimers = new Map<string, NodeJS.Timeout>();
  private readonly userClientConversations = new Map<string, string>();
  private readonly userConversationClients = new Map<string, Set<string>>();

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly jwtService: JwtService,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    if (this.getClientMode(client) === 'staff') {
      const staff = await this.authenticateDoctorStaff(client);
      if (!staff) {
        client.emit('chatbot:error', { message: 'Chỉ bác sĩ mới được tiếp nhận chat.' });
        client.disconnect(true);
        return;
      }

      client.data.staffId = staff.id;
      client.data.staffName = staff.name;
      client.data.canUseStaffChat = true;
      client.join('chatbot:staff');
      client.emit('chatbot:staff-queue', await this.getFreshStaffQueue());
      return;
    }

    const conversation = await this.chatbotService.startConversation(
      this.getConversationId(client),
      this.getRequester(client),
    );

    client.join(conversation.conversationId);
    this.trackUserClient(client, conversation.conversationId);
    this.clearUserIdleTimer(conversation.conversationId);
    client.emit('chatbot:conversation', conversation);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    if (this.getClientMode(client) === 'staff') return;

    const conversationId = this.userClientConversations.get(client.id);
    if (!conversationId) return;

    this.untrackUserClient(client.id, conversationId);

    const activeClients = this.userConversationClients.get(conversationId);
    if (!activeClients?.size) {
      this.scheduleUserIdleClose(conversationId);
    }
  }

  @SubscribeMessage('chatbot:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatbotMessagePayload,
  ): Promise<void> {
    if (payload.conversationId) {
      this.clearUserIdleTimer(payload.conversationId);
    }

    const result = await this.chatbotService.receiveUserMessage({
      ...payload,
      requester: this.mergeRequester(client, payload.requester),
    });
    const conversation = result.conversation;
    this.clearUserIdleTimer(conversation.conversationId);

    client.join(conversation.conversationId);
    this.trackUserClient(client, conversation.conversationId);
    this.server.to(conversation.conversationId).emit('chatbot:typing', false);
    this.server.to(conversation.conversationId).emit('chatbot:conversation', conversation);

    if (result.shouldNotifyStaff) {
      this.server
        .to('chatbot:staff')
        .emit('chatbot:staff-queue', await this.getFreshStaffQueue());
      this.server.to('chatbot:staff').emit('chatbot:handoff', conversation);
    }
  }

  @SubscribeMessage('chatbot:staff-join')
  async handleStaffJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StaffChatbotMessagePayload,
  ): Promise<void> {
    if (!this.canUseStaffChat(client)) return;
    if (!payload.conversationId) return;

    const result = await this.chatbotService.claimConversation(payload);
    client.join(payload.conversationId);
    client.emit('chatbot:conversation', result.conversation);
    this.server.to(payload.conversationId).emit('chatbot:conversation', result.conversation);
    this.server
      .to('chatbot:staff')
      .emit('chatbot:staff-queue', await this.getFreshStaffQueue());

    if (result.claimExpiresAt) {
      this.scheduleClaimRelease(payload.conversationId);
    }
  }

  @SubscribeMessage('chatbot:staff-message')
  async handleStaffMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StaffChatbotMessagePayload,
  ): Promise<void> {
    if (!this.canUseStaffChat(client)) return;
    if (!payload.conversationId) return;

    const conversation = await this.chatbotService.receiveStaffMessage(payload);
    this.clearClaimTimer(conversation.conversationId);
    this.scheduleUserIdleClose(conversation.conversationId);
    client.join(conversation.conversationId);
    this.server.to(conversation.conversationId).emit('chatbot:conversation', conversation);
    this.server
      .to('chatbot:staff')
      .emit('chatbot:staff-queue', await this.getFreshStaffQueue());
  }

  @SubscribeMessage('chatbot:history')
  async handleHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatbotHistoryPayload,
  ): Promise<void> {
    const history = await this.chatbotService.loadHistory(payload);
    if (!history) return;
    client.emit('chatbot:history', history);
  }

  @SubscribeMessage('chatbot:staff-queue:refresh')
  async handleStaffQueueRefresh(@ConnectedSocket() client: Socket): Promise<void> {
    if (this.getClientMode(client) !== 'staff' || !this.canUseStaffChat(client)) return;

    client.join('chatbot:staff');
    client.emit('chatbot:staff-queue', await this.getFreshStaffQueue());
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

  private getRequester(client: Socket): ChatbotMessagePayload['requester'] {
    const requester = client.handshake.auth?.requester;
    return this.mergeRequester(
      client,
      requester && typeof requester === 'object' ? requester : undefined,
    );
  }

  private mergeRequester(
    client: Socket,
    requester?: ChatbotMessagePayload['requester'],
  ): ChatbotMessagePayload['requester'] {
    return {
      ...(requester ?? {}),
      ipHash: this.createIpHash(client),
    };
  }

  private getClientMode(client: Socket): 'user' | 'staff' {
    return client.handshake.auth?.mode === 'staff' ? 'staff' : 'user';
  }

  private getAccessToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }

    return null;
  }

  private async authenticateDoctorStaff(client: Socket): Promise<Staff | null> {
    const token = this.getAccessToken(client);
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.accountType !== 'staff') return null;

      const staff = await this.staffRepository.findOne({
        where: { id: payload.sub, status: AccountStatus.ACTIVE },
        relations: { roles: true },
      });
      if (!staff) return null;

      return staff.roles?.some((role) => role.name === RoleEnum.DOCTOR)
        ? staff
        : null;
    } catch {
      return null;
    }
  }

  private canUseStaffChat(client: Socket): boolean {
    return this.getClientMode(client) === 'staff' && client.data.canUseStaffChat === true;
  }

  private trackUserClient(client: Socket, conversationId: string): void {
    if (this.getClientMode(client) === 'staff') return;

    const previousConversationId = this.userClientConversations.get(client.id);
    if (previousConversationId && previousConversationId !== conversationId) {
      this.untrackUserClient(client.id, previousConversationId);
    }

    this.userClientConversations.set(client.id, conversationId);
    const clients = this.userConversationClients.get(conversationId) ?? new Set<string>();
    clients.add(client.id);
    this.userConversationClients.set(conversationId, clients);
  }

  private untrackUserClient(clientId: string, conversationId: string): void {
    this.userClientConversations.delete(clientId);
    const clients = this.userConversationClients.get(conversationId);
    if (!clients) return;

    clients.delete(clientId);
    if (!clients.size) {
      this.userConversationClients.delete(conversationId);
    }
  }

  private createIpHash(client: Socket): string {
    const forwardedFor = client.handshake.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || client.handshake.address || 'unknown';

    return `ip:${createHash('sha256').update(rawIp).digest('hex').slice(0, 32)}`;
  }

  private async getFreshStaffQueue(): Promise<ChatbotConversationPayload[]> {
    await this.chatbotService.closeInactiveSupportConversations([
      ...this.userConversationClients.keys(),
    ]);
    return this.chatbotService.getStaffQueue();
  }

  private scheduleClaimRelease(conversationId: string): void {
    this.clearClaimTimer(conversationId);
    const timer = setTimeout(async () => {
      const conversation = await this.chatbotService.releaseClaimIfNoReply(conversationId);
      if (!conversation) return;

      this.server.to(conversationId).emit('chatbot:conversation', conversation);
      this.server
        .to('chatbot:staff')
        .emit('chatbot:staff-queue', await this.getFreshStaffQueue());
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

  private scheduleUserIdleClose(conversationId: string): void {
    this.clearUserIdleTimer(conversationId);
    const timer = setTimeout(async () => {
      const conversation = await this.chatbotService.closeConversationForUserIdle(conversationId);

      this.server.to(conversationId).emit('chatbot:conversation', conversation);
      this.server
        .to('chatbot:staff')
        .emit('chatbot:staff-queue', await this.getFreshStaffQueue());
      this.userIdleTimers.delete(conversationId);
    }, 5 * 60 * 1000);

    this.userIdleTimers.set(conversationId, timer);
  }

  private clearUserIdleTimer(conversationId: string): void {
    const timer = this.userIdleTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.userIdleTimers.delete(conversationId);
    }
  }
}
