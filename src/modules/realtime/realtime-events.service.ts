import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export type RealtimeForumEvent =
  | 'forum:post.created'
  | 'forum:post.updated'
  | 'forum:post.moderated'
  | 'forum:comment.created'
  | 'forum:comment.moderated'
  | 'forum:report.created'
  | 'forum:report.resolved';

export interface RealtimeForumEmitOptions {
  management?: boolean;
  postRoom?: boolean;
  public?: boolean;
}

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
}
