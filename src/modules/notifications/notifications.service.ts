import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  NotificationReferenceType,
  NotificationType,
} from '../../common/constants/notification.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';

export interface InternalNotificationInput {
  reference: string;
  type: NotificationType;
  title: string;
  content: string;
  referenceType: NotificationReferenceType;
  referenceId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /** Giữ tương thích với các module cũ; endpoint public không còn cho client tự tạo notification. */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const referenceType = dto.referenceType ?? NotificationReferenceType.PREGNANCY_PROFILE;
    const referenceId = dto.referenceId ?? dto.userId;
    const notification = this.notificationRepository.create({
      ...dto,
      userId: dto.userId,
      staffId: null,
      reference: `${dto.type}:${referenceType}:${referenceId}:${Date.now()}`,
      referenceType,
      referenceId,
      isRead: dto.isRead ?? false,
    });
    return this.notificationRepository.save(notification);
  }


  // tạo thông báo cho user nếu chưa có thông báo với reference này
  createForUserIfMissing(userId: string, input: InternalNotificationInput) {
    return this.createForRecipientIfMissing({ userId, staffId: null }, input);
  }

  createForStaffIfMissing(staffId: string, input: InternalNotificationInput) {
    return this.createForRecipientIfMissing({ userId: null, staffId }, input);
  }

  async findMine(user: AuthenticatedUser, limit = 50): Promise<Notification[]> {
    const recipient = this.getRecipientWhere(user);
    return this.notificationRepository.find({
      where: recipient,
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async countUnreadMine(user: AuthenticatedUser): Promise<number> {
    return this.notificationRepository.count({
      where: { ...this.getRecipientWhere(user), isRead: false },
    });
  }

  async markReadMine(id: string, user: AuthenticatedUser): Promise<Notification> {
    const notification = await this.findMineById(id, user);
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllReadMine(user: AuthenticatedUser): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { ...this.getRecipientWhere(user), isRead: false },
      { isRead: true },
    );
    return { affected: result.affected ?? 0 };
  }

  async removeMine(id: string, user: AuthenticatedUser): Promise<Notification> {
    const notification = await this.findMineById(id, user);
    return this.notificationRepository.softRemove(notification);
  }


  //
  private async createForRecipientIfMissing(
    recipient: { userId: string | null; staffId: string | null },
    input: InternalNotificationInput,
  ): Promise<Notification> {
    const existing = await this.notificationRepository.findOne({
      where: recipient.userId
        ? { reference: input.reference, userId: recipient.userId, staffId: IsNull() }
        : { reference: input.reference, userId: IsNull(), staffId: recipient.staffId! },
    });
    if (existing) return existing;

    return this.notificationRepository.save(
      this.notificationRepository.create({
        ...input,
        ...recipient,
        isRead: false,
      }),
    );
  }

  private async findMineById(id: string, user: AuthenticatedUser): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, ...this.getRecipientWhere(user) },
    });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    return notification;
  }

  private getRecipientWhere(user: AuthenticatedUser): { userId: string } | { staffId: string } {
    const isStaff = Boolean(
      user.employeeCode ||
        user.personalEmail ||
        (user.roles ?? []).length ||
        (user.facilities ?? []).length,
    );
    return isStaff ? { staffId: user.id } : { userId: user.id };
  }
}
