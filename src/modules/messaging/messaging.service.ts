import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import AdmZip from 'adm-zip';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { In, Repository } from 'typeorm';
import { MessagingChannelAccount } from './entities/messaging-channel-account.entity';
import { MessagingConversationTag } from './entities/messaging-conversation-tag.entity';
import { MessagingConversation } from './entities/messaging-conversation.entity';
import { MessagingCustomerIdentity } from './entities/messaging-customer-identity.entity';
import { MessagingMessage } from './entities/messaging-message.entity';
import { MessagingTag } from './entities/messaging-tag.entity';
import { Staff } from '../staffs/entities/staff.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { UserStatusEnum } from '../users/users.enum';
import {
  MessagingAccountStatus,
  MessagingChannel,
  MessagingConversationStatus,
  MessagingImportFormat,
  MessagingMessageDirection,
  MessagingMessageType,
  MessagingSenderType,
} from './types/messaging.enums';
import { CreateMessagingAccountDto } from './dto/create-messaging-account.dto';
import { ImportZaloAccountDto } from './dto/import-zalo-account.dto';
import { UpdateMessagingAccountDto } from './dto/update-messaging-account.dto';
import { MessagingEventsService } from './messaging-events.service';

type ZaloCredentials = {
  imei: string;
  cookie: unknown;
  userAgent: string;
  language?: string;
};

type IncomingMessageInput = {
  accountId: string;
  externalThreadId: string;
  externalThreadType: string;
  externalMessageId?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  content?: string | null;
  messageType?: MessagingMessageType;
  sentAt?: Date | null;
  metadata?: Record<string, unknown> | null;
};

type MessagingActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
};

type OutboundAttachmentInput = {
  url: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type ZaloPhoneProfile = {
  uid: string;
  zalo_name?: string;
  display_name?: string;
  avatar?: string;
  cover?: string;
  [key: string]: unknown;
};

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessagingChannelAccount)
    private readonly accountRepository: Repository<MessagingChannelAccount>,
    @InjectRepository(MessagingConversation)
    private readonly conversationRepository: Repository<MessagingConversation>,
    @InjectRepository(MessagingConversationTag)
    private readonly conversationTagRepository: Repository<MessagingConversationTag>,
    @InjectRepository(MessagingCustomerIdentity)
    private readonly customerIdentityRepository: Repository<MessagingCustomerIdentity>,
    @InjectRepository(MessagingMessage)
    private readonly messageRepository: Repository<MessagingMessage>,
    @InjectRepository(MessagingTag)
    private readonly tagRepository: Repository<MessagingTag>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly events: MessagingEventsService,
  ) {}

  async listAccounts(): Promise<MessagingChannelAccount[]> {
    const accounts = await this.accountRepository.find({ order: { createdAt: 'DESC' } });
    return accounts.map((account) => this.maskAccount(account));
  }

  async createAccount(dto: CreateMessagingAccountDto): Promise<MessagingChannelAccount> {
    const account = await this.accountRepository.save(
      this.accountRepository.create({
        channel: dto.channel,
        displayName: dto.displayName.trim(),
        proxyUrl: dto.proxyUrl?.trim() || null,
        autoStart: Boolean(dto.autoStart),
        status: MessagingAccountStatus.DISCONNECTED,
      }),
    );

    return this.maskAccount(account);
  }

  async createZaloQrAccount(input: {
    displayName?: string;
    proxyUrl?: string;
    autoStart?: boolean;
  }): Promise<MessagingChannelAccount> {
    const account = await this.accountRepository.save(
      this.accountRepository.create({
        channel: MessagingChannel.ZALO_PERSONAL,
        displayName: input.displayName?.trim() || 'Zalo QR login',
        proxyUrl: input.proxyUrl?.trim() || null,
        autoStart: Boolean(input.autoStart),
        status: MessagingAccountStatus.CONNECTING,
      }),
    );

    return account;
  }

  async updateAccount(id: string, dto: UpdateMessagingAccountDto): Promise<MessagingChannelAccount> {
    const account = await this.getAccountEntity(id);
    if (dto.displayName !== undefined) account.displayName = dto.displayName.trim();
    if (dto.proxyUrl !== undefined) account.proxyUrl = dto.proxyUrl?.trim() || null;
    if (dto.autoStart !== undefined) account.autoStart = Boolean(dto.autoStart);
    return this.maskAccount(await this.accountRepository.save(account));
  }

  async setAccountAutoStart(id: string, autoStart: boolean): Promise<void> {
    await this.accountRepository.update(id, { autoStart });
  }

  async deleteAccount(id: string): Promise<void> {
    const account = await this.getAccountEntity(id);
    if (
      account.status === MessagingAccountStatus.CONNECTED ||
      account.status === MessagingAccountStatus.CONNECTING
    ) {
      throw new BadRequestException('Vui lòng stop account trước khi xoá.');
    }

    await this.accountRepository.delete(id);
    this.events.emitToStaff('messages:account.deleted', { id });
  }

  async importZaloAccount(file: { buffer: Buffer; originalname?: string }, dto: ImportZaloAccountDto): Promise<MessagingChannelAccount> {
    const payload = this.readImportPayload(file);
    const credentials = this.normalizeZaloCredentials(payload);
    const displayName = dto.displayName?.trim() || this.getImportedDisplayName(payload) || 'Zalo cá nhân';

    const existing = await this.accountRepository.findOne({
      where: {
        channel: MessagingChannel.ZALO_PERSONAL,
        externalAccountId: credentials.imei,
      },
    });

    const account = existing ?? this.accountRepository.create({
      channel: MessagingChannel.ZALO_PERSONAL,
      status: MessagingAccountStatus.DISCONNECTED,
    });

    account.displayName = displayName;
    account.externalAccountId = credentials.imei;
    account.proxyUrl = dto.proxyUrl?.trim() || this.readString(payload.proxyUrl) || account.proxyUrl || null;
    account.autoStart = dto.autoStart ?? this.readBoolean(payload.autoStart) ?? account.autoStart ?? false;
    account.credentials = credentials as Record<string, unknown>;
    account.credentialFormat = MessagingImportFormat.ZALO_EXTRACTOR;
    account.lastError = null;

    return this.maskAccount(await this.accountRepository.save(account));
  }

  async getAccountForRuntime(id: string): Promise<MessagingChannelAccount> {
    return this.getAccountEntity(id);
  }

  async setAccountStatus(
    id: string,
    status: MessagingAccountStatus,
    error?: string | null,
  ): Promise<void> {
    const patch: QueryDeepPartialEntity<MessagingChannelAccount> = {
      status,
      lastError: error ?? null,
    };
    if (status === MessagingAccountStatus.CONNECTED) patch.lastConnectedAt = new Date();
    await this.accountRepository.update(id, patch);
    const account = await this.getAccountEntity(id);
    this.events.emitToStaff('messages:account.updated', this.maskAccount(account));
  }

  async completeZaloQrLogin(
    id: string,
    credentials: ZaloCredentials,
    userInfo?: { name?: string; avatar?: string } | null,
  ): Promise<MessagingChannelAccount> {
    const account = await this.getAccountEntity(id);
    account.credentials = credentials as Record<string, unknown>;
    account.credentialFormat = MessagingImportFormat.ZALO_EXTRACTOR;
    account.externalAccountId = credentials.imei;
    account.displayName = account.displayName || userInfo?.name || 'Zalo QR login';
    account.lastError = null;
    account.status = MessagingAccountStatus.CONNECTED;
    account.lastConnectedAt = new Date();
    const saved = await this.accountRepository.save(account);
    this.events.emitToStaff('messages:account.updated', this.maskAccount(saved));
    return saved;
  }

  emitQrEvent(payload: Record<string, unknown>): void {
    this.events.emitToStaff('messages:zalo.qr', payload);
  }

  async listTags(): Promise<MessagingTag[]> {
    return this.tagRepository.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async createTag(input: { name?: string; color?: string; sortOrder?: number }): Promise<MessagingTag> {
    const tag = await this.tagRepository.save(
      this.tagRepository.create({
        name: this.normalizeTagName(input.name),
        color: this.normalizeTagColor(input.color),
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      }),
    );
    this.events.emitToStaff('messages:tags.updated', await this.listTags());
    return tag;
  }

  async updateTag(id: string, input: { name?: string; color?: string; sortOrder?: number }): Promise<MessagingTag> {
    const tag = await this.getTagEntity(id);
    if (input.name !== undefined) tag.name = this.normalizeTagName(input.name);
    if (input.color !== undefined) tag.color = this.normalizeTagColor(input.color);
    if (input.sortOrder !== undefined && Number.isFinite(input.sortOrder)) tag.sortOrder = Number(input.sortOrder);
    const saved = await this.tagRepository.save(tag);
    this.events.emitToStaff('messages:tags.updated', await this.listTags());
    return saved;
  }

  async deleteTag(id: string): Promise<void> {
    await this.getTagEntity(id);
    await this.tagRepository.delete(id);
    this.events.emitToStaff('messages:tags.updated', await this.listTags());
  }

  async listConversations(filters?: { tagIds?: string[] }): Promise<MessagingConversation[]> {
    const qb = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.account', 'account')
      .orderBy('conversation.lastMessageAt', 'DESC')
      .addOrderBy('conversation.updatedAt', 'DESC')
      .take(100);

    const tagIds = this.normalizeIds(filters?.tagIds ?? []);
    if (tagIds.length > 0) {
      qb.innerJoin(
        MessagingConversationTag,
        'conversationTagFilter',
        'conversationTagFilter.conversation_id = conversation.id AND conversationTagFilter.tag_id IN (:...tagIds)',
        { tagIds },
      ).distinct(true);
    }

    return this.hydrateConversationTags(await qb.getMany());
  }

  async openZaloPhoneConversation(input: {
    accountId: string;
    phone: string;
    profile: ZaloPhoneProfile;
  }): Promise<MessagingConversation> {
    const account = await this.getAccountEntity(input.accountId);
    if (account.channel !== MessagingChannel.ZALO_PERSONAL) {
      throw new BadRequestException('Chỉ account Zalo cá nhân mới tìm hội thoại theo SĐT ở bước này.');
    }
    if (!input.profile?.uid) throw new BadRequestException('Không tìm thấy Zalo uid từ SĐT này.');

    const phone = this.normalizePhone(input.phone);
    const externalUserId = String(input.profile.uid);
    const displayName =
      this.readString(input.profile.display_name) ||
      this.readString(input.profile.zalo_name) ||
      phone ||
      externalUserId;
    const avatarUrl = this.readString(input.profile.avatar) || null;

    let conversation = await this.conversationRepository.findOne({
      where: {
        accountId: account.id,
        externalThreadId: externalUserId,
      },
      relations: { account: true },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        accountId: account.id,
        channel: account.channel,
        externalThreadId: externalUserId,
        externalThreadType: 'user',
        customerExternalId: externalUserId,
        customerName: displayName,
        status: MessagingConversationStatus.OPEN,
        unreadCount: 0,
        lastMessagePreview: 'Hội thoại mới từ tìm SĐT',
        metadata: {
          createdFrom: 'zalo_phone_search',
          customerPhone: phone || null,
          customerAvatarUrl: avatarUrl,
          zaloProfile: input.profile,
        },
      });
    } else {
      conversation.customerExternalId = conversation.customerExternalId || externalUserId;
      conversation.customerName = displayName || conversation.customerName;
      conversation.metadata = {
        ...(conversation.metadata ?? {}),
        customerPhone: phone || conversation.metadata?.customerPhone || null,
        customerAvatarUrl: avatarUrl || conversation.metadata?.customerAvatarUrl || null,
        zaloProfile: input.profile,
      };
    }

    const savedConversation = await this.conversationRepository.save(conversation);
    await this.upsertCustomerIdentityFromZaloProfile(savedConversation, {
      externalUserId,
      displayName,
      phone,
      avatarUrl,
      profile: input.profile,
    });

    const reloaded = await this.conversationRepository.findOneOrFail({
      where: { id: savedConversation.id },
      relations: { account: true },
    });
    const [hydrated] = await this.hydrateConversationTags([reloaded]);
    this.events.emitToStaff('messages:conversation.updated', hydrated);
    return hydrated;
  }

  async getMessages(conversationId: string): Promise<MessagingMessage[]> {
    await this.getConversationEntity(conversationId);
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: 200,
    });
  }

  async getConversationCustomer(conversationId: string): Promise<MessagingCustomerIdentity> {
    const conversation = await this.getConversationEntity(conversationId);
    return this.getOrCreateCustomerIdentity(conversation);
  }

  async updateConversationCustomer(
    conversationId: string,
    input: { displayName?: string; phone?: string; email?: string; address?: string; userId?: string | null },
  ): Promise<MessagingCustomerIdentity> {
    const conversation = await this.getConversationEntity(conversationId);
    const identity = await this.getOrCreateCustomerIdentity(conversation);
    if (input.displayName !== undefined) identity.displayName = this.readString(input.displayName) || null;
    if (input.phone !== undefined) identity.phone = this.readString(input.phone) || null;
    if (input.email !== undefined) identity.email = this.readString(input.email) || null;
    if (input.address !== undefined) identity.address = this.readString(input.address) || null;
    if (input.userId !== undefined) identity.userId = input.userId ? String(input.userId) : null;
    const saved = await this.customerIdentityRepository.save(identity);
    await this.syncConversationCustomerMetadata(conversation, saved);
    return saved;
  }

  async mapConversationUser(conversationId: string, userId: string | null): Promise<MessagingCustomerIdentity> {
    const conversation = await this.getConversationEntity(conversationId);
    const identity = await this.getOrCreateCustomerIdentity(conversation);
    if (!userId) {
      identity.userId = null;
      identity.user = null;
      const saved = await this.customerIdentityRepository.save(identity);
      await this.syncConversationCustomerMetadata(conversation, saved);
      return {
        ...saved,
        user: null,
      };
    }

    const user = await this.userRepository.findOne({ where: { id: String(userId) } });
    if (!user) throw new NotFoundException('Không tìm thấy user để map.');
    identity.userId = user.id;
    identity.displayName = identity.displayName || user.name;
    identity.phone = identity.phone || user.phone;
    identity.email = identity.email || user.email;
    identity.address = identity.address || user.address || null;
    const saved = await this.customerIdentityRepository.save(identity);
    await this.syncConversationCustomerMetadata(conversation, saved);
    return this.customerIdentityRepository.findOneOrFail({ where: { id: saved.id }, relations: { user: true } });
  }

  async quickCreateUserForConversation(conversationId: string): Promise<MessagingCustomerIdentity> {
    const conversation = await this.getConversationEntity(conversationId);
    const identity = await this.getOrCreateCustomerIdentity(conversation);
    const name = identity.displayName || conversation.customerName || 'Khách hàng';
    const phone = this.readString(identity.phone);
    const email = this.readString(identity.email);
    if (!phone || !email) {
      throw new BadRequestException('Cần nhập số điện thoại và email trước khi tạo user nhanh.');
    }

    let user = await this.userRepository.findOne({ where: [{ phone }, { email }] });
    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({
          name,
          phone,
          email,
          address: identity.address,
          status: UserStatusEnum.ACTIVE,
          metadata: {
            createdFrom: 'messaging',
            messagingIdentityId: identity.id,
          },
        }),
      );
    }

    identity.userId = user.id;
    const saved = await this.customerIdentityRepository.save(identity);
    await this.syncConversationCustomerMetadata(conversation, saved);
    return saved;
  }

  async getConversationAppointments(conversationId: string): Promise<Appointment[]> {
    const identity = await this.getConversationCustomer(conversationId);
    if (!identity.userId) return [];
    return this.appointmentRepository.find({
      where: { patientId: identity.userId },
      relations: { patient: true, service: true, doctor: true, facility: true, room: true },
      order: { scheduledStart: 'DESC' },
      take: 20,
    });
  }

  async recordIncoming(input: IncomingMessageInput): Promise<{
    conversation: MessagingConversation;
    message: MessagingMessage;
  }> {
    const account = await this.getAccountEntity(input.accountId);
    let conversation = await this.conversationRepository.findOne({
      where: {
        accountId: account.id,
        externalThreadId: input.externalThreadId,
      },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        accountId: account.id,
        channel: account.channel,
        externalThreadId: input.externalThreadId,
        externalThreadType: input.externalThreadType,
        customerExternalId: input.senderId ?? input.externalThreadId,
        customerName: input.senderName,
        status: MessagingConversationStatus.OPEN,
        unreadCount: 0,
        metadata: input.metadata ?? null,
      });
    }

    const content = input.content?.trim() || null;
    const nextMetadata = {
      ...(conversation.metadata ?? {}),
      ...(input.metadata ?? {}),
    };
    conversation.customerName = input.senderName ?? conversation.customerName;
    conversation.customerExternalId = input.senderId ?? conversation.customerExternalId ?? input.externalThreadId;
    conversation.metadata = nextMetadata;
    conversation.lastMessagePreview = content ?? this.messageTypePreview(input.messageType);
    conversation.lastMessageAt = input.sentAt ?? new Date();
    conversation.unreadCount = Number(conversation.unreadCount ?? 0) + 1;
    conversation = await this.conversationRepository.save(conversation);

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        accountId: account.id,
        externalMessageId: input.externalMessageId ?? null,
        direction: MessagingMessageDirection.INBOUND,
        senderType: MessagingSenderType.CUSTOMER,
        senderId: input.senderId ?? null,
        senderName: input.senderName ?? null,
        messageType: input.messageType ?? MessagingMessageType.TEXT,
        content,
        metadata: input.metadata ?? null,
        sentAt: input.sentAt ?? new Date(),
      }),
    );

    this.events.emitToStaff('messages:conversation.updated', conversation);
    this.events.emitConversation(conversation.id, 'messages:message.new', message);
    this.events.emitToStaff('messages:message.new', { conversation, message });

    return { conversation, message };
  }

  async recordOutbound(
    conversationId: string,
    staff: { id?: string; name?: string },
    content: string,
    attachment?: OutboundAttachmentInput | null,
  ): Promise<{
    conversation: MessagingConversation;
    message: MessagingMessage;
  }> {
    let conversation = await this.getConversationEntity(conversationId);
    const now = new Date();
    const cleanContent = content.trim();
    const messageType = attachment
      ? (attachment.mimeType?.startsWith('image/') ? MessagingMessageType.IMAGE : MessagingMessageType.FILE)
      : MessagingMessageType.TEXT;
    const preview = cleanContent || attachment?.name || this.messageTypePreview(messageType);
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        accountId: conversation.accountId,
        direction: MessagingMessageDirection.OUTBOUND,
        senderType: MessagingSenderType.STAFF,
        senderId: staff.id ?? null,
        senderName: staff.name ?? 'Tư vấn viên',
        messageType,
        content: cleanContent || null,
        metadata: {
          deliveryStatus: 'pending',
          attachmentUrl: attachment?.url ?? null,
          attachmentName: attachment?.name ?? null,
          attachmentMimeType: attachment?.mimeType ?? null,
          attachmentSize: attachment?.size ?? null,
          imageUrl: attachment?.mimeType?.startsWith('image/') ? attachment.url : null,
        },
        sentAt: now,
      }),
    );

    conversation.lastMessagePreview = preview;
    conversation.lastMessageAt = now;
    conversation.unreadCount = 0;
    conversation = await this.conversationRepository.save(conversation);

    this.events.emitToStaff('messages:conversation.updated', conversation);
    this.events.emitConversation(conversation.id, 'messages:message.new', message);
    return { conversation, message };
  }

  async updateOutboundDelivery(
    messageId: string,
    status: 'pending' | 'sent' | 'failed',
    error?: string | null,
    providerResponse?: unknown,
  ): Promise<MessagingMessage> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn.');

    const zaloMsgId = this.extractProviderString(providerResponse, ['msgId', 'message.msgId', 'attachment.0.msgId']) ??
      this.readMetadataString(message.metadata, 'zaloMsgId');
    const zaloCliMsgId = this.extractProviderString(providerResponse, ['cliMsgId', '_cliMsgId', '_clientIds.0', 'message.cliMsgId', 'attachment.0.cliMsgId']) ??
      this.readMetadataString(message.metadata, 'zaloCliMsgId');
    const metadata = {
      ...(message.metadata ?? {}),
      deliveryStatus: status,
      deliveryError: status === 'failed' ? error ?? 'Không gửi được tin nhắn.' : null,
      deliveredAt: status === 'sent' ? new Date().toISOString() : message.metadata?.deliveredAt ?? null,
      failedAt: status === 'failed' ? new Date().toISOString() : message.metadata?.failedAt ?? null,
      zaloSendResponse: providerResponse ?? message.metadata?.zaloSendResponse ?? null,
      zaloMsgId: zaloMsgId ?? null,
      zaloCliMsgId: zaloCliMsgId ?? null,
    };
    if (status === 'sent' && zaloMsgId) message.externalMessageId = zaloMsgId;
    message.metadata = metadata;
    const saved = await this.messageRepository.save(message);
    this.events.emitConversation(saved.conversationId, 'messages:message.updated', saved);
    this.events.emitToStaff('messages:message.updated', saved);
    return saved;
  }

  async getOutboundMessageForUndo(conversationId: string, messageId: string): Promise<{
    conversation: MessagingConversation;
    message: MessagingMessage;
    payload: { msgId: string | number; cliMsgId: string | number };
  }> {
    const conversation = await this.getConversationEntity(conversationId);
    const message = await this.messageRepository.findOne({ where: { id: messageId, conversationId } });
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn.');
    if (message.direction !== MessagingMessageDirection.OUTBOUND) {
      throw new BadRequestException('Chỉ thu hồi được tin nhắn mình gửi.');
    }
    if (this.readMetadataString(message.metadata, 'recalledAt')) {
      throw new BadRequestException('Tin nhắn này đã được thu hồi.');
    }

    const response = message.metadata?.zaloSendResponse;
    const msgId = this.readMetadataString(message.metadata, 'zaloMsgId') ??
      message.externalMessageId ??
      this.extractProviderString(response, ['msgId', 'message.msgId', 'attachment.0.msgId']);
    const cliMsgId = this.readMetadataString(message.metadata, 'zaloCliMsgId') ??
      this.extractProviderString(response, ['cliMsgId', '_cliMsgId', '_clientIds.0', 'message.cliMsgId', 'attachment.0.cliMsgId']);
    if (!msgId || !cliMsgId) {
      throw new BadRequestException('Tin nhắn này thiếu mã thu hồi từ Zalo. Hãy thử với tin nhắn gửi mới sau khi cập nhật.');
    }
    return { conversation, message, payload: { msgId, cliMsgId } };
  }

  async markOutboundRecalled(messageId: string, providerResponse?: unknown): Promise<MessagingMessage> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn.');
    const now = new Date().toISOString();
    message.metadata = {
      ...(message.metadata ?? {}),
      deliveryStatus: 'recalled',
      recalledAt: now,
      originalContent: message.content,
      undoResponse: providerResponse ?? null,
    };
    message.content = null;
    const saved = await this.messageRepository.save(message);
    this.events.emitConversation(saved.conversationId, 'messages:message.updated', saved);
    this.events.emitToStaff('messages:message.updated', saved);
    return saved;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.getConversationEntity(id);
    await this.conversationTagRepository.delete({ conversationId: id });
    await this.conversationRepository.delete(id);
    this.events.emitToStaff('messages:conversation.deleted', { id });
  }

  async getOutboundMessageForRetry(conversationId: string, messageId: string): Promise<{
    conversation: MessagingConversation;
    message: MessagingMessage;
  }> {
    const conversation = await this.getConversationEntity(conversationId);
    const message = await this.messageRepository.findOne({ where: { id: messageId, conversationId } });
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn.');
    if (message.direction !== MessagingMessageDirection.OUTBOUND) {
      throw new BadRequestException('Chỉ retry được tin nhắn gửi ra.');
    }
    return { conversation, message };
  }

  async markConversationRead(conversationId: string, actor?: MessagingActor | null): Promise<MessagingConversation> {
    const conversation = await this.getConversationEntity(conversationId);
    conversation.unreadCount = 0;
    if (actor?.id) {
      conversation.metadata = {
        ...(conversation.metadata ?? {}),
        seenBy: this.upsertMetadataList(conversation.metadata, 'seenBy', {
          id: actor.id,
          name: actor.name ?? actor.email ?? 'Nhân viên',
          email: actor.email ?? null,
          avatar: actor.avatar ?? null,
          seenAt: new Date().toISOString(),
        }, 'id'),
      };
    }
    const [saved] = await this.hydrateConversationTags([await this.conversationRepository.save(conversation)]);
    this.events.emitToStaff('messages:conversation.updated', saved);
    return saved;
  }

  async assignConversation(
    conversationId: string,
    staffId?: string | null,
    actor?: MessagingActor | null,
  ): Promise<MessagingConversation> {
    const conversation = await this.getConversationEntity(conversationId);
    const previousName = conversation.assignedStaffName;

    if (!staffId) {
      conversation.assignedStaffId = null;
      conversation.assignedStaffName = null;
    } else {
      const staff = await this.staffRepository.findOne({ where: { id: staffId } });
      if (!staff) throw new NotFoundException('Không tìm thấy nhân viên để phân công.');
      conversation.assignedStaffId = staff.id;
      conversation.assignedStaffName = staff.name;
    }

    conversation.metadata = this.appendConversationHistory(conversation.metadata, {
      type: 'assignment',
      actor,
      description: staffId
        ? `Phân công cho ${conversation.assignedStaffName}`
        : `Bỏ phân công${previousName ? ` từ ${previousName}` : ''}`,
      at: new Date().toISOString(),
    });
    const [saved] = await this.hydrateConversationTags([await this.conversationRepository.save(conversation)]);
    this.events.emitToStaff('messages:conversation.updated', saved);
    return saved;
  }

  async setConversationTags(
    conversationId: string,
    tagIds: string[],
    actor?: MessagingActor | null,
  ): Promise<MessagingConversation> {
    const conversation = await this.getConversationEntity(conversationId);
    const currentRows = await this.conversationTagRepository.find({
      where: { conversationId },
      relations: { tag: true },
    });
    const currentTagIds = currentRows.map((row) => String(row.tagId));
    const nextTagIds = this.normalizeIds(tagIds).slice(0, 20);
    const tags = nextTagIds.length > 0
      ? await this.tagRepository.find({ where: { id: In(nextTagIds) } })
      : [];
    const normalizedTagIds = tags.map((tag) => String(tag.id));
    const nextTagNames = tags.map((tag) => tag.name);
    const currentTagNames = currentRows.map((row) => row.tag?.name).filter((name): name is string => Boolean(name));
    const added = tags.filter((tag) => !currentTagIds.includes(String(tag.id)));
    const removed = currentRows.filter((row) => !normalizedTagIds.includes(String(row.tagId)));
    let metadata: Record<string, unknown> = {
      ...(conversation.metadata ?? {}),
      tagIds: normalizedTagIds,
      tags: nextTagNames,
    };
    for (const tag of added) {
      metadata = this.appendConversationHistory(metadata, {
        type: 'tag_added',
        actor,
        tag: tag.name,
        description: `Đã thêm thẻ ${tag.name}`,
        at: new Date().toISOString(),
      });
    }
    for (const row of removed) {
      const tagName = row.tag?.name ?? currentTagNames.find((name) => name) ?? 'Không rõ';
      metadata = this.appendConversationHistory(metadata, {
        type: 'tag_removed',
        actor,
        tag: tagName,
        description: `Đã gỡ thẻ ${tagName}`,
        at: new Date().toISOString(),
      });
    }
    conversation.metadata = metadata;

    await this.conversationTagRepository.delete({ conversationId });
    if (normalizedTagIds.length > 0) {
      await this.conversationTagRepository.save(
        normalizedTagIds.map((tagId) => this.conversationTagRepository.create({ conversationId, tagId })),
      );
    }

    const [saved] = await this.hydrateConversationTags([await this.conversationRepository.save(conversation)]);
    this.events.emitToStaff('messages:conversation.updated', saved);
    return saved;
  }

  private appendConversationHistory(
    metadata: Record<string, unknown> | null,
    entry: Record<string, unknown>,
  ): Record<string, unknown> {
    const history = Array.isArray(metadata?.history) ? metadata.history : [];
    return {
      ...(metadata ?? {}),
      history: [...history, entry].slice(-100),
    };
  }

  private messageTypePreview(messageType?: MessagingMessageType): string {
    if (messageType === MessagingMessageType.IMAGE) return '[Hình ảnh]';
    if (messageType === MessagingMessageType.STICKER) return '[Sticker]';
    if (messageType === MessagingMessageType.FILE) return '[Tệp đính kèm]';
    return '[Nội dung chưa hỗ trợ]';
  }

  private upsertMetadataList(
    metadata: Record<string, unknown> | null,
    key: string,
    item: Record<string, unknown>,
    identityKey: string,
  ): Record<string, unknown>[] {
    const current = Array.isArray(metadata?.[key])
      ? metadata?.[key] as Record<string, unknown>[]
      : [];
    const next = current.filter((entry) => entry?.[identityKey] !== item[identityKey]);
    return [...next, item].slice(-30);
  }

  private readImportPayload(file: { buffer: Buffer; originalname?: string }): Record<string, unknown> {
    if (!file?.buffer?.length) throw new BadRequestException('File import không hợp lệ.');

    const name = file.originalname?.toLowerCase() ?? '';
    if (name.endsWith('.zip')) {
      const zip = new AdmZip(file.buffer);
      const entry = zip
        .getEntries()
        .find((item) => !item.isDirectory && item.entryName.toLowerCase().endsWith('.json'));
      if (!entry) throw new BadRequestException('Zip không có file JSON phiên đăng nhập.');
      return this.parseJson(entry.getData().toString('utf8'));
    }

    return this.parseJson(file.buffer.toString('utf8'));
  }

  private parseJson(raw: string): Record<string, unknown> {
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Invalid JSON object');
      }
      return value as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Không đọc được JSON trong file import.');
    }
  }

  private normalizeZaloCredentials(payload: Record<string, unknown>): ZaloCredentials {
    const source = (payload.credentials && typeof payload.credentials === 'object')
      ? payload.credentials as Record<string, unknown>
      : payload;

    const imei = this.readString(source.imei);
    const userAgent = this.readString(source.userAgent ?? source.useragent ?? source['user-agent']);
    const cookie = source.cookie ?? source.cookies;
    const language = this.readString(source.language) || 'vi';

    if (!imei || !userAgent || !cookie) {
      throw new BadRequestException('File import cần có imei, cookies và userAgent.');
    }

    return { imei, cookie, userAgent, language };
  }

  private getImportedDisplayName(payload: Record<string, unknown>): string | null {
    return this.readString(payload.displayName ?? payload.accountName ?? payload.name) || null;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readMetadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
    const value = metadata?.[key];
    const text = typeof value === 'number' ? String(value) : this.readString(value);
    return text || null;
  }

  private extractProviderString(source: unknown, paths: string[]): string | null {
    for (const path of paths) {
      const value = path.split('.').reduce<unknown>((current, part) => {
        if (current === null || current === undefined) return undefined;
        if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
        if (typeof current === 'object') return (current as Record<string, unknown>)[part];
        return undefined;
      }, source);
      const text = typeof value === 'number' ? String(value) : this.readString(value);
      if (text) return text;
    }
    return null;
  }

  private normalizePhone(value?: string | null): string {
    const raw = this.readString(value).replace(/[^\d+]/g, '');
    if (!raw) return '';
    if (raw.startsWith('+84')) return `0${raw.slice(3)}`;
    if (raw.startsWith('84') && raw.length >= 10) return `0${raw.slice(2)}`;
    return raw;
  }

  private readBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return undefined;
  }

  private async hydrateConversationTags(conversations: MessagingConversation[]): Promise<MessagingConversation[]> {
    const conversationIds = conversations.map((conversation) => conversation.id);
    if (conversationIds.length === 0) return conversations;

    const rows = await this.conversationTagRepository.find({
      where: { conversationId: In(conversationIds) },
      relations: { tag: true },
      order: { createdAt: 'ASC' },
    });
    const tagMap = new Map<string, MessagingTag[]>();
    for (const row of rows) {
      if (!row.tag) continue;
      const tags = tagMap.get(String(row.conversationId)) ?? [];
      tags.push(row.tag);
      tagMap.set(String(row.conversationId), tags);
    }

    return conversations.map((conversation) => {
      const tags = tagMap.get(String(conversation.id)) ?? [];
      const tagItems = tags
        .sort((left, right) => (left.sortOrder - right.sortOrder) || left.name.localeCompare(right.name))
        .map((tag) => ({ id: String(tag.id), name: tag.name, color: tag.color }));
      return {
        ...conversation,
        metadata: {
          ...(conversation.metadata ?? {}),
          tagIds: tagItems.map((tag) => tag.id),
          tags: tagItems.map((tag) => tag.name),
          tagItems,
        },
      };
    });
  }

  private async getTagEntity(id: string): Promise<MessagingTag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Không tìm thấy thẻ hội thoại.');
    return tag;
  }

  private normalizeTagName(value?: string): string {
    const name = this.readString(value).replace(/\s+/g, ' ');
    if (!name) throw new BadRequestException('Tên thẻ không được trống.');
    if (name.length > 80) throw new BadRequestException('Tên thẻ tối đa 80 ký tự.');
    return name;
  }

  private normalizeTagColor(value?: string): string {
    const color = this.readString(value) || '#64748b';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new BadRequestException('Màu thẻ cần là mã hex, ví dụ #0f766e.');
    }
    return color.toLowerCase();
  }

  private normalizeIds(values: string[]): string[] {
    return Array.from(new Set(
      values
        .map((value) => String(value).trim())
        .filter((value) => /^\d+$/.test(value)),
    ));
  }

  private async getAccountEntity(id: string): Promise<MessagingChannelAccount> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Không tìm thấy account messaging.');
    return account;
  }

  private async getConversationEntity(id: string): Promise<MessagingConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: { account: true },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại.');
    return conversation;
  }

  private async getOrCreateCustomerIdentity(conversation: MessagingConversation): Promise<MessagingCustomerIdentity> {
    const externalUserId = conversation.customerExternalId || conversation.externalThreadId;
    let identity = await this.customerIdentityRepository.findOne({
      where: {
        channel: conversation.channel,
        accountId: conversation.accountId,
        externalUserId,
      },
      relations: { user: true },
    });
    if (identity) return identity;

    identity = await this.customerIdentityRepository.save(
      this.customerIdentityRepository.create({
        channel: conversation.channel,
        accountId: conversation.accountId,
        externalUserId,
        displayName: conversation.customerName,
        phone: this.readString(conversation.metadata?.customerPhone) || null,
        email: this.readString(conversation.metadata?.customerEmail) || null,
        address: this.readString(conversation.metadata?.customerAddress) || null,
      }),
    );
    return this.customerIdentityRepository.findOneOrFail({
      where: { id: identity.id },
      relations: { user: true },
    });
  }

  private async upsertCustomerIdentityFromZaloProfile(
    conversation: MessagingConversation,
    input: {
      externalUserId: string;
      displayName: string;
      phone: string;
      avatarUrl: string | null;
      profile: ZaloPhoneProfile;
    },
  ): Promise<void> {
    let identity = await this.customerIdentityRepository.findOne({
      where: {
        channel: conversation.channel,
        accountId: conversation.accountId,
        externalUserId: input.externalUserId,
      },
    });
    if (!identity) {
      identity = this.customerIdentityRepository.create({
        channel: conversation.channel,
        accountId: conversation.accountId,
        externalUserId: input.externalUserId,
      });
    }

    identity.displayName = input.displayName || identity.displayName;
    identity.phone = input.phone || identity.phone;
    identity.metadata = {
      ...(identity.metadata ?? {}),
      customerAvatarUrl: input.avatarUrl,
      zaloProfile: input.profile,
    };
    await this.customerIdentityRepository.save(identity);
  }

  private async syncConversationCustomerMetadata(
    conversation: MessagingConversation,
    identity: MessagingCustomerIdentity,
  ): Promise<void> {
    conversation.customerName = identity.displayName || conversation.customerName;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      customerIdentityId: identity.id,
      mappedUserId: identity.userId,
      customerPhone: identity.phone,
      customerEmail: identity.email,
      customerAddress: identity.address,
    };
    const saved = await this.conversationRepository.save(conversation);
    this.events.emitToStaff('messages:conversation.updated', saved);
  }

  private maskAccount(account: MessagingChannelAccount): MessagingChannelAccount {
    return {
      ...account,
      proxyUrl: account.proxyUrl ? this.maskProxy(account.proxyUrl) : null,
      credentials: account.credentials ? { imported: true } : null,
    };
  }

  private maskProxy(proxyUrl: string): string {
    try {
      const url = new URL(proxyUrl);
      if (url.password) url.password = '***';
      if (url.username) url.username = `${url.username.slice(0, 2)}***`;
      return url.toString();
    } catch {
      return '***';
    }
  }
}
