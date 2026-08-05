import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
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

  @SubscribeMessage('appointment:join')
  joinAppointment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { appointmentId?: string },
  ): { joined: string } | { error: string } {
    const appointmentId = String(payload?.appointmentId ?? '').trim();
    if (!/^[1-9]\d*$/.test(appointmentId)) return { error: 'appointmentId is invalid' };

    const room = `appointment:${appointmentId}`;
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('appointment:leave')
  leaveAppointment(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { appointmentId?: string },
  ): { left: string } | { error: string } {
    const appointmentId = String(payload?.appointmentId ?? '').trim();
    if (!/^[1-9]\d*$/.test(appointmentId)) return { error: 'appointmentId is invalid' };

    const room = `appointment:${appointmentId}`;
    client.leave(room);
    return { left: room };
  }
}
