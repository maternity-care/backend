import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeEventsService } from './realtime-events.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: '*' },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  constructor(private readonly realtimeEvents: RealtimeEventsService) {}

  afterInit(server: Server): void {
    this.realtimeEvents.bindServer(server);
  }

  handleConnection(client: Socket): void {
    client.join('forum:public');
  }

  handleDisconnect(client: Socket): void {
    client.leave('forum:public');
  }

  @SubscribeMessage('forum:join')
  joinForumPost(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { postId?: string },
  ): { joined: string } {
    const postId = String(payload?.postId ?? '').trim();
    if (!postId) return { joined: 'forum:public' };

    const room = `forum:post:${postId}`;
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('forum:leave')
  leaveForumPost(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { postId?: string },
  ): { left: string } {
    const postId = String(payload?.postId ?? '').trim();
    if (!postId) return { left: 'forum:public' };

    const room = `forum:post:${postId}`;
    client.leave(room);
    return { left: room };
  }

  @SubscribeMessage('order:join')
  joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code?: string },
  ): { joined: string } {
    const orderId = String(payload?.code ?? '').trim();
    if (!orderId) {
      throw new WsException('orderId is required');
    }

    const room = `order:payment:${orderId}`;
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('order:leave')
  leaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId?: string },
  ): { left: string } {
    const orderId = String(payload?.orderId ?? '').trim();
    if (!orderId) {
      throw new WsException('orderId is required');
    }

    const room = `order:payment:${orderId}`;
    client.leave(room);
    return { left: room };
  }
}
