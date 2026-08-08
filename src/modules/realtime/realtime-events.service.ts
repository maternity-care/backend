import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export type RealtimeForumEvent =
  | 'forum:post.created'
  | 'forum:post.updated'
  | 'forum:post.moderated'
  | 'forum:post.deleted'
  | 'forum:comment.created'
  | 'forum:comment.updated'
  | 'forum:comment.moderated'
  | 'forum:comment.deleted'
  | 'forum:report.created'
  | 'forum:report.resolved';

export type RealtimeMedicalRecordEvent = 'medical-record:file.pending';

export interface RealtimeForumEmitOptions {
  management?: boolean;
  postRoom?: boolean;
  public?: boolean;
}

export type RealtimeNotificationRecipient = 'user' | 'staff';

@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger(RealtimeEventsService.name);
  private server: Server | null = null;

  bindServer(server: Server): void {
    this.server = server;
  }

  emitForumEvent(
    event: RealtimeForumEvent,
    payload: Record<string, unknown>,
    options: RealtimeForumEmitOptions = {},
  ): void {
    if (!this.server) {
      this.logger.debug(`Realtime server is not ready for event ${event}`);
      return;
    }

    const shouldEmitPublic = options.public ?? false;
    const shouldEmitPostRoom = options.postRoom ?? false;
    const shouldEmitManagement = options.management ?? false;

    if (shouldEmitPublic) {
      this.server.to('forum:public').emit(event, payload);
    }

    if (shouldEmitManagement) {
      this.server.to('forum:management').emit(event, payload);
    }

    const postId = payload.postId ?? payload.id;
    if (shouldEmitPostRoom && postId) {
      this.server.to(`forum:post:${postId}`).emit(event, payload);
    }
  }

  emitAppointmentEvent(
    event: RealtimeMedicalRecordEvent,
    appointmentId: string,
    payload: Record<string, unknown>,
  ): void {
    if (!this.server) {
      this.logger.debug(`Realtime server is not ready for event ${event}`);
      return;
    }

    this.server.to(`appointment:${appointmentId}`).emit(event, payload);
  }

  emitNotification(
    recipientType: RealtimeNotificationRecipient,
    recipientId: string,
    payload: Record<string, unknown>,
  ): void {
    if (!this.server) {
      this.logger.debug('Realtime server is not ready for notification:new');
      return;
    }

    this.server
      .to(`notifications:${recipientType}:${recipientId}`)
      .emit('notification:new', payload);
  }

  serverEmit = (payload: SocketEmit) => {
    if (!this.server) {
      this.logger.debug(`Realtime server is not ready for event ${payload.event}`);
      return;
    }
    if (payload?.room) {
      this.server.to(payload.room).emit(payload.event, payload.data);
    } else {
      this.server.emit(payload.event, payload.data);
    }
  };
}

export interface SocketEmit {
  room?: string;
  event: string;
  data: Record<string, string | number> | string | number | boolean | null;
}
