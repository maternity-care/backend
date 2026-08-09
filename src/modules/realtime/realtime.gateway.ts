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
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { AccountStatus } from '../../common/constants/status.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  StaffPermission,
  StaffPermissionEffectEnum,
} from '../permissions/entities/staff-permission.entity';
import { Staff } from '../staffs/entities/staff.entity';
import { User } from '../users/entities/user.entity';
import { RealtimeEventsService } from './realtime-events.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: '*' },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly jwtService: JwtService,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(StaffPermission)
    private readonly staffPermissionRepository: Repository<StaffPermission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  afterInit(server: Server): void {
    this.realtimeEvents.bindServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    client.join('forum:public');

    const token = this.getAccessToken(client);
    if (!token) return;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.accountType === 'user') {
        const userExists = await this.userRepository.exist({
          where: { id: payload.sub, status: AccountStatus.ACTIVE },
        });
        if (!userExists) return;

        client.data.accountId = payload.sub;
        client.data.accountType = 'user';
        client.join(`notifications:user:${payload.sub}`);
        return;
      }

      const staff = await this.staffRepository.findOne({
        where: { id: payload.sub, status: AccountStatus.ACTIVE },
        relations: { roles: { permissions: true } },
      });
      if (!staff) return;

      client.data.accountId = staff.id;
      client.data.accountType = 'staff';
      client.join(`notifications:staff:${staff.id}`);
      if (!(await this.canAccessForumManagement(staff))) return;
      client.join('forum:management');
    } catch {
      // Public forum realtime remains available when an optional token is invalid.
    }
  }

  handleDisconnect(client: Socket): void {
    client.leave('forum:public');
    client.leave('forum:management');
    if (client.data.accountType && client.data.accountId) {
      client.leave(`notifications:${client.data.accountType}:${client.data.accountId}`);
    }
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

  private getAccessToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization !== 'string') return null;
    const [scheme, token] = authorization.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }

  private async canAccessForumManagement(staff: Staff): Promise<boolean> {
    if (staff.roles.some((role) => role.name === RoleEnum.SUPER_ADMIN)) return true;

    const acceptedPermissions = new Set<string>([
      PermissionEnum.FORUM_VIEW,
      PermissionEnum.FORUM_MODERATE,
      PermissionEnum.FORUM_REPORT_VIEW,
      PermissionEnum.FORUM_REPORT_RESOLVE,
    ]);
    const overrides = await this.staffPermissionRepository.find({
      where: { staffId: staff.id },
      relations: { permission: true },
    });
    if (
      overrides.some(
        (override) =>
          acceptedPermissions.has(override.permission.name) &&
          override.effect === StaffPermissionEffectEnum.DENY,
      )
    ) {
      return false;
    }
    if (
      overrides.some(
        (override) =>
          acceptedPermissions.has(override.permission.name) &&
          override.effect === StaffPermissionEffectEnum.ALLOW,
      )
    ) {
      return true;
    }

    const managementRoles = new Set<string>([RoleEnum.ADMIN, RoleEnum.MODERATOR, RoleEnum.STAFF]);
    if (!staff.roles.some((role) => managementRoles.has(role.name))) return false;

    return staff.roles.some((role) =>
      (role.permissions ?? []).some((permission) => acceptedPermissions.has(permission.name)),
    );
  }

  @SubscribeMessage('order:join')
  joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code?: string },
  ): { joined: string } {
    const code = String(payload?.code ?? '').trim();
    if (!code) {
      throw new WsException('code is required');
    }

    const room = `order:payment:${code}`;
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('order:leave')
  leaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code?: string },
  ): { left: string } {
    const code = String(payload?.code ?? '').trim();
    if (!code) {
      throw new WsException('code is required');
    }

    const room = `order:payment:${code}`;
    client.leave(room);
    return { left: room };
  }
}
