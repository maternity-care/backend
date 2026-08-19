import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { AccountStatus } from '../../common/constants/status.enum';
import { Staff } from '../staffs/entities/staff.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MessagingEventsService } from './messaging-events.service';
import { MessagingService } from './messaging.service';

@WebSocketGateway({
  namespace: 'messages',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;
  private readonly conversationViewers = new Map<string, Map<string, {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  }>>();

  constructor(
    private readonly events: MessagingEventsService,
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  afterInit(server: Server): void {
    this.events.bindServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.getAccessToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const staff = await this.staffRepository.findOne({
        where: { id: payload.sub, status: AccountStatus.ACTIVE },
      });
      if (!staff) {
        client.disconnect(true);
        return;
      }

      client.data.staff = {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        avatar: staff.avatar,
      };
      client.join('messages:staff');
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.removeViewer(client);
  }

  @SubscribeMessage('messages:conversation.join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: string },
  ): Promise<void> {
    if (!payload.conversationId) return;
    this.removeViewer(client);
    client.join(`messages:conversation:${payload.conversationId}`);
    client.data.conversationId = payload.conversationId;
    this.addViewer(payload.conversationId, client);
    await this.messagingService.markConversationRead(payload.conversationId, client.data.staff);
  }

  @SubscribeMessage('messages:conversation.leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: string },
  ): void {
    if (!payload.conversationId) return;
    client.leave(`messages:conversation:${payload.conversationId}`);
    this.removeViewer(client, payload.conversationId);
  }

  @SubscribeMessage('messages:conversation.typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: string; typing?: boolean },
  ): void {
    if (!payload.conversationId || !client.data.staff?.id) return;
    client
      .to(`messages:conversation:${payload.conversationId}`)
      .emit('messages:conversation.typing', {
        conversationId: payload.conversationId,
        typing: Boolean(payload.typing),
        staff: client.data.staff,
      });
  }

  private addViewer(conversationId: string, client: Socket): void {
    const staff = client.data.staff;
    if (!staff?.id) return;
    const viewers = this.conversationViewers.get(conversationId) ?? new Map();
    viewers.set(client.id, staff);
    this.conversationViewers.set(conversationId, viewers);
    this.emitViewers(conversationId);
  }

  private removeViewer(client: Socket, conversationId = client.data.conversationId): void {
    if (!conversationId) return;
    const viewers = this.conversationViewers.get(conversationId);
    if (!viewers) return;
    viewers.delete(client.id);
    if (viewers.size === 0) {
      this.conversationViewers.delete(conversationId);
    } else {
      this.conversationViewers.set(conversationId, viewers);
    }
    if (client.data.conversationId === conversationId) client.data.conversationId = undefined;
    this.emitViewers(conversationId);
  }

  private emitViewers(conversationId: string): void {
    const unique = new Map<string, {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
    }>();
    for (const viewer of this.conversationViewers.get(conversationId)?.values() ?? []) {
      unique.set(viewer.id, viewer);
    }
    const payload = {
      conversationId,
      viewers: Array.from(unique.values()),
    };
    this.server.to(`messages:conversation:${conversationId}`).emit('messages:conversation.viewers', payload);
    this.server.to('messages:staff').emit('messages:conversation.viewers', payload);
  }

  private getAccessToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }

    return null;
  }
}
