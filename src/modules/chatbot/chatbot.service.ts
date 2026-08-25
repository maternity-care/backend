import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MessagingChannelAccount } from '../messaging/entities/messaging-channel-account.entity';
import { MessagingConversation } from '../messaging/entities/messaging-conversation.entity';
import { MessagingCustomerIdentity } from '../messaging/entities/messaging-customer-identity.entity';
import { MessagingMessage } from '../messaging/entities/messaging-message.entity';
import { MessagingEventsService } from '../messaging/messaging-events.service';
import {
  MessagingAccountStatus,
  MessagingChannel,
  MessagingConversationStatus,
  MessagingImportFormat,
  MessagingMessageDirection,
  MessagingMessageType,
  MessagingSenderType,
} from '../messaging/types/messaging.enums';
import { UploadsService } from '../uploads/uploads.service';
import {
  ChatbotConversationPayload,
  ChatbotHistoryResponse,
  ChatbotMessage,
  ChatbotMessagePayload,
  ChatbotRequester,
  ChatbotSender,
  StaffChatbotMessagePayload,
} from './chatbot.types';
import { GeminiChatbotService } from './gemini-chatbot.service';

const DEFAULT_WELCOME_MESSAGE =
  'Xin chào mẹ bầu 🌸 Mình là trợ lý Maternity Care. Bạn có thể hỏi về lịch khám, hồ sơ thai kỳ, dịch vụ hoặc cách liên hệ nhân viên hỗ trợ.';

const FALLBACK_REPLY =
  'Mình đã ghi nhận câu hỏi của bạn. Nếu cần tư vấn y tế cụ thể, bạn hãy bấm nút “Gặp tư vấn viên/bác sĩ” trong khung chat này để được bác sĩ hỗ trợ nhé.';

const STAFF_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const USER_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 50;

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(MessagingChannelAccount)
    private readonly accountRepository: Repository<MessagingChannelAccount>,
    @InjectRepository(MessagingConversation)
    private readonly conversationRepository: Repository<MessagingConversation>,
    @InjectRepository(MessagingCustomerIdentity)
    private readonly customerIdentityRepository: Repository<MessagingCustomerIdentity>,
    @InjectRepository(MessagingMessage)
    private readonly messageRepository: Repository<MessagingMessage>,
    private readonly dataSource: DataSource,
    private readonly uploadsService: UploadsService,
    private readonly geminiChatbotService: GeminiChatbotService,
    private readonly events: MessagingEventsService,
  ) {}

  async startConversation(conversationId?: string, requester?: ChatbotRequester): Promise<ChatbotConversationPayload> {
    let conversation = await this.findReusableConversation(conversationId, requester);
    if (!conversation) {
      const account = await this.getWebChatAccount();
      const requesterMetadata = this.sanitizeRequester(requester);
      conversation = await this.conversationRepository.save(
        this.conversationRepository.create({
          accountId: account.id,
          account,
          channel: MessagingChannel.WEB_CHAT,
          externalThreadId: this.resolveExternalThreadId(requester),
          externalThreadType: 'web_chat',
          customerExternalId: requester?.id ?? requester?.guestKey ?? requester?.ipHash ?? null,
          customerName: requester?.name ?? 'Khách web',
          status: MessagingConversationStatus.OPEN,
          unreadCount: 0,
          metadata: {
            source: 'web_chatbot',
            chatbotStatus: 'bot',
            requester: requesterMetadata,
            guestKey: this.normalizeGuestKey(requester),
            userId: requester?.id ?? null,
            activeFacilityId: requester?.activeFacilityId ?? requester?.facilities?.[0]?.id ?? null,
          },
        }),
      );
      conversation = await this.syncLoggedInRequesterIdentity(conversation, requester);
      await this.createMessage(conversation.id, 'bot', DEFAULT_WELCOME_MESSAGE);
      await this.emitConversationUpdated(conversation.id);
    } else if (requester) {
      conversation = await this.updateRequester(conversation, requester);
    }

    return this.getConversation(conversation.id);
  }

  async receiveUserMessage(payload: ChatbotMessagePayload): Promise<{
    conversation: ChatbotConversationPayload;
    shouldNotifyStaff: boolean;
  }> {
    let conversation = await this.ensureConversation(payload.conversationId, payload.requester);
    const wasClosed = this.getChatbotStatus(conversation) === 'closed';

    if (wasClosed) {
      conversation = await this.setChatbotStatus(await this.clearAssignment(conversation), 'waiting_for_staff');
    }

    if (payload.requestStaff) {
      const alreadyWaiting = !wasClosed && this.getChatbotStatus(conversation) !== 'bot';
      conversation = await this.setChatbotStatus(await this.clearAssignment(conversation), 'waiting_for_staff');

      if (!alreadyWaiting) {
        await this.createMessage(
          conversation.id,
          'system',
          'Mình đã chuyển cuộc trò chuyện này đến tư vấn viên/bác sĩ. Bạn chờ một chút nhé.',
        );
      }

      await this.emitConversationUpdated(conversation.id);
      return {
        conversation: await this.getConversation(conversation.id),
        shouldNotifyStaff: true,
      };
    }

    const content = payload.content?.trim();
    const hasFile = Boolean(payload.fileUrl);
    const geminiReadableFiles = this.getGeminiReadableFiles(payload);
    if (!content && !hasFile) {
      return { conversation: await this.getConversation(conversation.id), shouldNotifyStaff: false };
    }

    await this.createMessage(conversation.id, 'user', content ?? '', {
      senderId: payload.requester?.id,
      messageType: payload.messageType ?? (payload.fileUrl ? 'file' : 'text'),
      fileUrl: payload.fileKey ?? payload.fileUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
    });

    let shouldNotifyStaff = wasClosed;

    if (wasClosed) {
      await this.createMessage(
        conversation.id,
        'system',
        'Cuộc trò chuyện đã được mở lại và đang chờ tư vấn viên/bác sĩ tiếp nhận.',
      );
    } else if (content && this.shouldHandoffToStaff(content)) {
      conversation = await this.setChatbotStatus(await this.clearAssignment(conversation), 'waiting_for_staff');
      await this.createMessage(
        conversation.id,
        'system',
        'Mình đã chuyển cuộc trò chuyện này đến tư vấn viên/bác sĩ. Bạn chờ một chút nhé.',
      );
      shouldNotifyStaff = true;
    } else if (['waiting_for_staff', 'staff_joined'].includes(this.getChatbotStatus(conversation))) {
      shouldNotifyStaff = !conversation.assignedStaffId;
    } else if (content || geminiReadableFiles.length > 0) {
      const recentMessages = await this.getLatestMessageEntities(conversation.id, 8);
      const systemContext = await this.buildSystemLookupContext(content ?? '', payload.requester);
      const geminiReply = await this.geminiChatbotService.generateReplyWithFiles(
        content ?? '',
        recentMessages.map((message) => this.mapMessageForPrompt(message)),
        geminiReadableFiles,
        {
          channel: 'web_chat',
          supportsButtons: true,
          supportsLinks: true,
          systemContext,
        },
      );
      await this.createMessage(
        conversation.id,
        'bot',
        geminiReply || this.buildBotReply(content ?? '', geminiReadableFiles.length > 0),
      );
    }

    await this.emitConversationUpdated(conversation.id);
    return {
      conversation: await this.getConversation(conversation.id),
      shouldNotifyStaff,
    };
  }

  async receiveStaffMessage(payload: StaffChatbotMessagePayload): Promise<ChatbotConversationPayload> {
    if (!payload.conversationId) return this.startConversation(undefined);

    let conversation = await this.ensureConversation(payload.conversationId);
    const content = payload.content?.trim();
    const hasFile = Boolean(payload.fileUrl);

    if (!content && !hasFile) return this.getConversation(conversation.id);

    const staffName = payload.staffName?.trim() || 'Tư vấn viên';
    const staffId = payload.staffId?.trim() || staffName;

    if (conversation.assignedStaffId && conversation.assignedStaffId !== staffId) {
      return this.getConversation(conversation.id);
    }

    conversation.assignedStaffId = staffId;
    conversation.assignedStaffName = staffName;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      chatbotStatus: 'staff_joined',
      claimExpiresAt: null,
    };
    conversation = await this.conversationRepository.save(conversation);

    await this.createMessage(conversation.id, 'staff', content ?? '', {
      senderId: staffId,
      senderName: staffName,
      messageType: payload.messageType ?? (payload.fileUrl ? 'file' : 'text'),
      fileUrl: payload.fileKey ?? payload.fileUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
    });

    await this.emitConversationUpdated(conversation.id);
    return this.getConversation(conversation.id);
  }

  async claimConversation(payload: StaffChatbotMessagePayload): Promise<{
    conversation: ChatbotConversationPayload;
    claimed: boolean;
    claimExpiresAt?: Date;
  }> {
    if (!payload.conversationId) {
      const conversation = await this.startConversation(undefined);
      return { conversation, claimed: false };
    }

    let conversation = await this.ensureConversation(payload.conversationId);
    const staffName = payload.staffName?.trim() || 'Tư vấn viên';
    const staffId = payload.staffId?.trim() || staffName;

    if (conversation.assignedStaffId && conversation.assignedStaffId !== staffId) {
      return { conversation: await this.getConversation(conversation.id), claimed: false };
    }

    const wasAssigned = Boolean(conversation.assignedStaffId);
    const expiresAt = new Date(Date.now() + STAFF_CLAIM_TIMEOUT_MS);

    conversation.assignedStaffId = staffId;
    conversation.assignedStaffName = staffName;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      chatbotStatus: 'staff_joined',
      claimExpiresAt: expiresAt.toISOString(),
    };
    conversation = await this.conversationRepository.save(conversation);

    if (!wasAssigned) {
      await this.createMessage(conversation.id, 'system', `${staffName} đang nhận tư vấn cuộc trò chuyện này.`);
    }

    await this.emitConversationUpdated(conversation.id);
    return {
      conversation: await this.getConversation(conversation.id),
      claimed: !wasAssigned,
      claimExpiresAt: expiresAt,
    };
  }

  async releaseClaimIfNoReply(conversationId: string): Promise<ChatbotConversationPayload | null> {
    let conversation = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conversation || !this.getClaimExpiresAt(conversation)) return null;

    const assignedStaffName = conversation.assignedStaffName || 'Tư vấn viên';
    conversation = await this.setChatbotStatus(await this.clearAssignment(conversation), 'waiting_for_staff');

    await this.createMessage(
      conversationId,
      'system',
      `${assignedStaffName} chưa phản hồi sau 5 phút, cuộc chat đã được mở lại cho bác sĩ/tư vấn viên khác.`,
    );

    await this.emitConversationUpdated(conversation.id);
    return this.getConversation(conversationId);
  }

  async closeConversationForUserIdle(conversationId: string): Promise<ChatbotConversationPayload> {
    let conversation = await this.ensureConversation(conversationId);
    if (this.getChatbotStatus(conversation) === 'bot' || this.getChatbotStatus(conversation) === 'closed') {
      return this.getConversation(conversation.id);
    }

    const assignedStaffName = conversation.assignedStaffName || 'Tư vấn viên';
    const hadAssignedStaff = Boolean(conversation.assignedStaffId);

    conversation.status = MessagingConversationStatus.CLOSED;
    conversation = await this.setChatbotStatus(await this.clearAssignment(conversation), 'closed');

    await this.createMessage(
      conversation.id,
      'system',
      hadAssignedStaff
        ? `${assignedStaffName} đã rời cuộc trò chuyện vì bạn không phản hồi trong 5 phút. Nếu cần hỗ trợ tiếp, hãy nhắn lại để hệ thống phân tư vấn viên/bác sĩ mới.`
        : 'Cuộc trò chuyện đã đóng vì bạn đã ngắt kết nối quá 5 phút. Nếu cần hỗ trợ tiếp, hãy nhắn lại để hệ thống phân tư vấn viên/bác sĩ mới.',
    );

    await this.emitConversationUpdated(conversation.id);
    return this.getConversation(conversation.id);
  }

  async endConversation(
    conversationId: string,
    actor: { type: 'user' | 'staff'; id?: string | null; name?: string | null },
  ): Promise<ChatbotConversationPayload> {
    let conversation = await this.ensureConversation(conversationId);
    if (this.getChatbotStatus(conversation) === 'closed') {
      return this.getConversation(conversation.id);
    }

    const actorName = actor.name?.trim() || (actor.type === 'staff' ? 'Tư vấn viên' : 'Khách hàng');
    conversation.status = MessagingConversationStatus.CLOSED;
    conversation = await this.setChatbotStatus(await this.clearAssignment(conversation), 'closed');
    await this.createMessage(
      conversation.id,
      'system',
      actor.type === 'staff'
        ? `${actorName} đã kết thúc cuộc trò chuyện.`
        : 'Bạn đã kết thúc cuộc trò chuyện. Nếu cần hỗ trợ tiếp, hãy mở chat và nhắn lại nhé.',
      {
        senderId: actor.id,
        senderName: actorName,
      },
    );
    await this.emitConversationUpdated(conversation.id);
    return this.getConversation(conversation.id);
  }

  async getStaffQueue(): Promise<ChatbotConversationPayload[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.channel = :channel', { channel: MessagingChannel.WEB_CHAT })
      .andWhere("JSON_UNQUOTE(JSON_EXTRACT(conversation.metadata, '$.chatbotStatus')) NOT IN (:...hidden)", {
        hidden: ['bot', 'closed'],
      })
      .orderBy('conversation.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return Promise.all(conversations.map((conversation) => this.getConversation(conversation.id, 1)));
  }

  async closeInactiveSupportConversations(activeConversationIds: string[]): Promise<void> {
    const cutoff = new Date(Date.now() - USER_IDLE_TIMEOUT_MS);
    const query = this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.channel = :channel', { channel: MessagingChannel.WEB_CHAT })
      .andWhere("JSON_UNQUOTE(JSON_EXTRACT(conversation.metadata, '$.chatbotStatus')) NOT IN (:...hidden)", {
        hidden: ['bot', 'closed'],
      })
      .andWhere('conversation.updatedAt < :cutoff', { cutoff });

    if (activeConversationIds.length > 0) {
      query.andWhere('conversation.id NOT IN (:...activeConversationIds)', { activeConversationIds });
    }

    const conversations = await query.getMany();
    for (const conversation of conversations) {
      await this.closeConversationForUserIdle(conversation.id);
    }
  }

  async getConversation(conversationId: string, messageLimit = DEFAULT_HISTORY_LIMIT): Promise<ChatbotConversationPayload> {
    const conversation = await this.ensureConversation(conversationId);
    const messages = await this.getLatestMessageEntities(conversation.id, messageLimit + 1);
    const hasMoreMessages = messages.length > messageLimit;
    const visibleMessages = hasMoreMessages ? messages.slice(1) : messages;

    return {
      conversationId: conversation.id,
      status: this.getChatbotStatus(conversation),
      requester: this.getRequester(conversation),
      assignedStaffId: conversation.assignedStaffId ?? undefined,
      assignedStaffName: conversation.assignedStaffName ?? undefined,
      claimExpiresAt: this.getClaimExpiresAt(conversation)?.toISOString(),
      messages: await this.mapMessages(visibleMessages),
      hasMoreMessages,
    };
  }

  async loadHistory(payload: { conversationId?: string; beforeMessageId?: string; limit?: number }): Promise<ChatbotHistoryResponse | null> {
    if (!payload.conversationId) return null;
    const limit = Math.min(Math.max(payload.limit ?? DEFAULT_HISTORY_LIMIT, 1), MAX_HISTORY_LIMIT);
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId: payload.conversationId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit + 1);

    if (payload.beforeMessageId) {
      const cursor = await this.messageRepository.findOne({ where: { id: payload.beforeMessageId } });
      if (cursor) {
        query.andWhere(
          '(message.createdAt < :createdAt OR (message.createdAt = :createdAt AND message.id < :id))',
          { createdAt: cursor.createdAt, id: cursor.id },
        );
      }
    }

    const rows = await query.getMany();
    const hasMore = rows.length > limit;
    const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();

    return {
      conversationId: payload.conversationId,
      messages: await this.mapMessages(messages),
      hasMore,
    };
  }

  private async ensureConversation(conversationId?: string, requester?: ChatbotRequester): Promise<MessagingConversation> {
    const conversation = await this.findReusableConversation(conversationId, requester);
    if (conversation) return requester ? this.updateRequester(conversation, requester) : conversation;

    const created = await this.startConversation(undefined, requester);
    return this.conversationRepository.findOneOrFail({ where: { id: created.conversationId } });
  }

  private async findReusableConversation(
    conversationId?: string,
    requester?: ChatbotRequester,
  ): Promise<MessagingConversation | null> {
    const byId = conversationId
      ? await this.conversationRepository.findOne({ where: { id: conversationId, channel: MessagingChannel.WEB_CHAT } })
      : null;
    if (byId) return byId;

    const account = await this.getWebChatAccount();
    if (conversationId) {
      const byLegacyId = await this.conversationRepository
        .createQueryBuilder('conversation')
        .where('conversation.accountId = :accountId', { accountId: account.id })
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(conversation.metadata, '$.oldChatConversationId')) = :conversationId", {
          conversationId,
        })
        .orderBy('conversation.updatedAt', 'DESC')
        .addOrderBy('conversation.id', 'DESC')
        .getOne();
      if (byLegacyId) return byLegacyId;
    }

    const externalThreadId = this.resolveExternalThreadId(requester);
    return this.conversationRepository.findOne({
      where: {
        accountId: account.id,
        externalThreadId,
      },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });
  }

  private async updateRequester(
    conversation: MessagingConversation,
    requester: ChatbotRequester,
  ): Promise<MessagingConversation> {
    const requesterMetadata = this.sanitizeRequester(requester);
    conversation.customerExternalId = requester.id ?? requester.guestKey ?? requester.ipHash ?? conversation.customerExternalId;
    conversation.customerName = requester.name ?? conversation.customerName;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      requester: requesterMetadata,
      guestKey: requester.id ? null : this.normalizeGuestKey(requester) ?? conversation.metadata?.guestKey ?? null,
      userId: requester.id ?? conversation.metadata?.userId ?? null,
      activeFacilityId: requester.activeFacilityId ?? requester.facilities?.[0]?.id ?? conversation.metadata?.activeFacilityId ?? null,
    };
    const saved = await this.conversationRepository.save(conversation);
    return this.syncLoggedInRequesterIdentity(saved, requester);
  }

  private async syncLoggedInRequesterIdentity(
    conversation: MessagingConversation,
    requester?: ChatbotRequester,
  ): Promise<MessagingConversation> {
    if (!requester?.id) return conversation;

    const externalUserId = String(requester.id);
    let identity = await this.customerIdentityRepository.findOne({
      where: {
        channel: MessagingChannel.WEB_CHAT,
        accountId: conversation.accountId,
        externalUserId,
      },
    });

    identity ??= this.customerIdentityRepository.create({
      channel: MessagingChannel.WEB_CHAT,
      accountId: conversation.accountId,
      externalUserId,
    });
    identity.userId = externalUserId;
    identity.displayName = requester.name ?? identity.displayName ?? conversation.customerName;
    identity.phone = requester.phone ?? identity.phone ?? null;
    identity.email = requester.email ?? identity.email ?? null;
    identity.address = requester.address ?? identity.address ?? null;
    identity.metadata = {
      ...(identity.metadata ?? {}),
      source: 'web_chatbot',
      requester: this.sanitizeRequester(requester),
    };
    identity = await this.customerIdentityRepository.save(identity);

    conversation.customerExternalId = externalUserId;
    conversation.customerName = requester.name ?? conversation.customerName;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      customerIdentityId: identity.id,
      userId: externalUserId,
      mappedUserId: externalUserId,
      customerPhone: identity.phone,
      customerEmail: identity.email,
      customerAddress: identity.address,
    };
    return this.conversationRepository.save(conversation);
  }

  private async getWebChatAccount(): Promise<MessagingChannelAccount> {
    const externalAccountId = 'web-chatbot';
    let account = await this.accountRepository.findOne({
      where: { channel: MessagingChannel.WEB_CHAT, externalAccountId },
    });
    if (account) return account;

    account = await this.accountRepository.save(
      this.accountRepository.create({
        channel: MessagingChannel.WEB_CHAT,
        displayName: 'Website chatbot',
        externalAccountId,
        status: MessagingAccountStatus.CONNECTED,
        autoStart: true,
        credentialFormat: MessagingImportFormat.WEB_CHAT,
        credentials: { source: 'builtin_chatbot' },
      }),
    );
    this.events.emitToStaff('messages:account.updated', account);
    return account;
  }

  private async setChatbotStatus(
    conversation: MessagingConversation,
    status: ChatbotConversationPayload['status'],
  ): Promise<MessagingConversation> {
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      chatbotStatus: status,
      claimExpiresAt: status === 'staff_joined' ? conversation.metadata?.claimExpiresAt ?? null : null,
    };
    if (status !== 'closed') conversation.status = MessagingConversationStatus.OPEN;
    return this.conversationRepository.save(conversation);
  }

  private sanitizeRequester(requester?: ChatbotRequester): Record<string, unknown> | null {
    if (!requester) return null;

    return {
      id: requester.id,
      guestKey: requester.guestKey,
      ipHash: requester.ipHash,
      name: requester.name,
      email: requester.email,
      phone: requester.phone,
      address: requester.address,
      activeFacilityId: requester.activeFacilityId,
      facilities: requester.facilities?.map((facility) => ({
        id: facility.id,
        name: facility.name,
        code: facility.code,
        status: facility.status,
        address: facility.address,
      })),
    };
  }

  private normalizeGuestKey(requester?: ChatbotRequester): string | null {
    const raw = requester?.guestKey || requester?.ipHash;
    if (!raw) return null;
    return raw.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 120) || null;
  }

  private resolveExternalThreadId(requester?: ChatbotRequester): string {
    if (requester?.id) return `user:${requester.id}`;
    const guestKey = this.normalizeGuestKey(requester);
    if (guestKey) return `guest:${guestKey}`;
    return 'guest:anonymous';
  }

  private async clearAssignment(conversation: MessagingConversation): Promise<MessagingConversation> {
    conversation.assignedStaffId = null;
    conversation.assignedStaffName = null;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      claimExpiresAt: null,
    };
    return this.conversationRepository.save(conversation);
  }

  private async buildSystemLookupContext(message: string, requester?: ChatbotRequester): Promise<string | null> {
    const normalized = this.normalizeSearchText(message);
    const wantsFacility = this.includesAny(normalized, [
      'co so',
      'phong kham',
      'clinic',
      'facility',
      'chi nhanh',
      'dia chi',
      'hotline',
      'so dien thoai',
      'sdt',
      'email',
      'lien he',
    ]);
    const wantsAppointment = this.includesAny(normalized, [
      'lich',
      'hen',
      'bac si',
      'bsi',
      'bs ',
      'ca kham',
      'dat lich',
    ]);

    if (!wantsFacility && !wantsAppointment) return null;

    const scopedFacilityIds = this.resolveRequesterFacilityIds(requester);
    const sections: string[] = [];

    if (wantsFacility) {
      const facilities = await this.loadFacilityContext(scopedFacilityIds);
      sections.push(
        [
          'Cơ sở/phòng khám:',
          facilities.length > 0
            ? facilities.map((facility, index) => {
              const address = [facility.address, facility.ward, facility.province].filter(Boolean).join(', ');
              return `${index + 1}. ${facility.name} (${facility.code}) - Địa chỉ: ${address || 'chưa có'}; SĐT/Hotline: ${facility.phone || 'chưa có'}; Email: ${facility.email || 'chưa có'}.`;
            }).join('\n')
            : 'Chưa có cơ sở/phòng khám phù hợp trong hệ thống.',
        ].join('\n'),
      );
    }

    if (wantsAppointment) {
      const appointments = await this.loadAppointmentContext(scopedFacilityIds);
      sections.push(
        [
          'Lịch hẹn gần đây/sắp tới:',
          appointments.length > 0
            ? appointments.map((appointment, index) => {
              const doctor = [appointment.doctorTitle, appointment.doctorName].filter(Boolean).join(' ');
              return `${index + 1}. Lịch #${appointment.id} - ${appointment.date} ${appointment.startTime}-${appointment.endTime}; Bác sĩ: ${doctor || 'chưa gắn'}; Dịch vụ: ${appointment.serviceName || 'chưa có'}; Cơ sở: ${appointment.facilityName || 'chưa có'}; Phòng: ${appointment.roomName || 'chưa có'}; Trạng thái: ${appointment.status || 'chưa rõ'}.`;
            }).join('\n')
            : 'Chưa tìm thấy lịch hẹn phù hợp trong hệ thống.',
        ].join('\n'),
      );
    }

    return sections.join('\n\n').slice(0, 6000);
  }

  private resolveRequesterFacilityIds(requester?: ChatbotRequester): string[] {
    const ids = [
      requester?.activeFacilityId,
      ...(requester?.facilities?.map((facility) => facility.id) ?? []),
    ]
      .map((value) => String(value ?? '').trim())
      .filter((value) => /^\d+$/.test(value));
    return Array.from(new Set(ids));
  }

  private async loadFacilityContext(scopedFacilityIds: string[]): Promise<Array<{
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    province: string | null;
    ward: string | null;
  }>> {
    const params: unknown[] = [];
    let scopeSql = '';
    if (scopedFacilityIds.length > 0) {
      scopeSql = `AND facility.id IN (${scopedFacilityIds.map(() => '?').join(',')})`;
      params.push(...scopedFacilityIds);
    }

    return this.dataSource.query(
      `
        SELECT
          CAST(facility.id AS CHAR) AS id,
          facility.code AS code,
          facility.name AS name,
          facility.phone AS phone,
          facility.email AS email,
          facility.address AS address,
          facility.province AS province,
          facility.ward AS ward
        FROM facilities facility
        WHERE facility.deleted_at IS NULL
          ${scopeSql}
        ORDER BY facility.name ASC
        LIMIT 20
      `,
      params,
    );
  }

  private async loadAppointmentContext(scopedFacilityIds: string[]): Promise<Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    facilityName: string | null;
    serviceName: string | null;
    roomName: string | null;
    doctorTitle: string | null;
    doctorName: string | null;
  }>> {
    const params: unknown[] = [];
    let scopeSql = '';
    if (scopedFacilityIds.length > 0) {
      scopeSql = `AND appointment.facility_id IN (${scopedFacilityIds.map(() => '?').join(',')})`;
      params.push(...scopedFacilityIds);
    }

    return this.dataSource.query(
      `
        SELECT
          CAST(appointment.id AS CHAR) AS id,
          DATE_FORMAT(appointment.scheduled_start, '%d/%m/%Y') AS date,
          DATE_FORMAT(appointment.scheduled_start, '%H:%i') AS startTime,
          DATE_FORMAT(appointment.scheduled_end, '%H:%i') AS endTime,
          appointment.status AS status,
          facility.name AS facilityName,
          service.name AS serviceName,
          room.name AS roomName,
          doctor.title AS doctorTitle,
          staff.name AS doctorName
        FROM appointments appointment
        LEFT JOIN facilities facility ON facility.id = appointment.facility_id
        LEFT JOIN services service ON service.id = appointment.service_id
        LEFT JOIN rooms room ON room.id = appointment.room_id
        LEFT JOIN staffs staff ON staff.id = appointment.doctor_id
        LEFT JOIN doctors doctor ON doctor.staff_id = staff.id
        WHERE appointment.scheduled_start >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          AND appointment.scheduled_start < DATE_ADD(CURDATE(), INTERVAL 31 DAY)
          ${scopeSql}
        ORDER BY appointment.scheduled_start ASC
        LIMIT 30
      `,
      params,
    );
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  private getGeminiReadableFiles(payload: ChatbotMessagePayload): Array<{ url: string; mimeType: string }> {
    if (
      payload.messageType !== 'image' ||
      !payload.fileUrl ||
      !payload.mimeType?.toLowerCase().startsWith('image/')
    ) {
      return [];
    }

    const urls = [payload.aiFileUrl, payload.fileUrl].filter((url): url is string => Boolean(url?.trim()));
    return Array.from(new Set(urls)).map((url) => ({ url, mimeType: payload.mimeType! }));
  }

  private async createMessage(
    conversationId: string,
    sender: ChatbotSender,
    content: string,
    options: {
      senderId?: string | null;
      senderName?: string;
      messageType?: 'text' | 'image' | 'file';
      fileUrl?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    } = {},
  ): Promise<MessagingMessage> {
    const conversation = await this.conversationRepository.findOneOrFail({ where: { id: conversationId } });
    const now = new Date();
    const messageType = this.toMessagingMessageType(options.messageType);
    const attachmentUrl = options.fileUrl ?? null;
    const attachmentName = options.fileName ?? null;
    const isOutbound = sender !== 'user';
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId,
        accountId: conversation.accountId,
        externalMessageId: null,
        direction: isOutbound ? MessagingMessageDirection.OUTBOUND : MessagingMessageDirection.INBOUND,
        senderType: sender === 'user'
          ? MessagingSenderType.CUSTOMER
          : sender === 'staff'
            ? MessagingSenderType.STAFF
            : MessagingSenderType.SYSTEM,
        senderId: options.senderId && /^\d+$/.test(options.senderId) ? options.senderId : null,
        senderName: options.senderName ?? (sender === 'bot' ? 'AI hỗ trợ' : null),
        messageType,
        content: content || null,
        metadata: {
          source: 'web_chatbot',
          autoReply: sender === 'bot',
          attachmentUrl,
          attachmentName,
          attachmentMimeType: options.mimeType ?? null,
          attachmentSize: options.fileSize ?? null,
          imageUrl: messageType === MessagingMessageType.IMAGE ? attachmentUrl : null,
        },
        sentAt: now,
        readAt: null,
      }),
    );

    conversation.lastMessagePreview = content || attachmentName || this.messageTypePreview(messageType);
    conversation.lastMessageAt = now;
    conversation.unreadCount = sender === 'user' ? Number(conversation.unreadCount ?? 0) + 1 : 0;
    const savedConversation = await this.conversationRepository.save(conversation);
    const conversationPayload = await this.conversationRepository.findOne({
      where: { id: savedConversation.id },
      relations: { account: true },
    });
    this.events.emitConversation(conversation.id, 'messages:message.new', message);
    this.events.emitToStaff('messages:message.new', {
      conversation: conversationPayload ?? savedConversation,
      message,
    });
    return message;
  }

  private async getLatestMessageEntities(conversationId: string, limit: number): Promise<MessagingMessage[]> {
    const rows = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  private async mapMessages(messages: MessagingMessage[]): Promise<ChatbotMessage[]> {
    return Promise.all(messages.map((message) => this.mapMessage(message)));
  }

  private async mapMessage(message: MessagingMessage): Promise<ChatbotMessage> {
    const attachmentUrl = this.readMetadataString(message.metadata, 'imageUrl') ??
      this.readMetadataString(message.metadata, 'attachmentUrl');
    const fileUrl = attachmentUrl ? await this.resolveFileUrl(attachmentUrl) : null;
    const fileName = this.readMetadataString(message.metadata, 'attachmentName');
    const mimeType = this.readMetadataString(message.metadata, 'attachmentMimeType');
    const fileSizeValue = message.metadata?.attachmentSize;
    const fileSize = typeof fileSizeValue === 'number' ? fileSizeValue : null;

    return {
      id: message.id,
      conversationId: message.conversationId,
      sender: this.fromMessagingSender(message),
      senderName: message.senderName ?? undefined,
      messageType: this.fromMessagingMessageType(message.messageType),
      content: message.content ?? fileName ?? '',
      fileUrl,
      fileName,
      mimeType,
      fileSize,
      createdAt: (message.sentAt ?? message.createdAt).toISOString(),
    };
  }

  private mapMessageForPrompt(message: MessagingMessage): ChatbotMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      sender: this.fromMessagingSender(message),
      senderName: message.senderName ?? undefined,
      messageType: this.fromMessagingMessageType(message.messageType),
      content: message.content ?? this.readMetadataString(message.metadata, 'attachmentName') ?? '',
      fileUrl: this.readMetadataString(message.metadata, 'imageUrl') ?? this.readMetadataString(message.metadata, 'attachmentUrl'),
      fileName: this.readMetadataString(message.metadata, 'attachmentName'),
      mimeType: this.readMetadataString(message.metadata, 'attachmentMimeType'),
      fileSize: null,
      createdAt: (message.sentAt ?? message.createdAt).toISOString(),
    };
  }

  private async emitConversationUpdated(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: { account: true },
    });
    if (!conversation) return;
    this.events.emitToStaff('messages:conversation.updated', conversation);
  }

  private getChatbotStatus(conversation: MessagingConversation): ChatbotConversationPayload['status'] {
    const status = this.readMetadataString(conversation.metadata, 'chatbotStatus');
    if (status === 'waiting_for_staff' || status === 'staff_joined' || status === 'closed') return status;
    return 'bot';
  }

  private getRequester(conversation: MessagingConversation): ChatbotRequester | undefined {
    const requester = conversation.metadata?.requester;
    return requester && typeof requester === 'object' ? requester as ChatbotRequester : undefined;
  }

  private getClaimExpiresAt(conversation: MessagingConversation): Date | null {
    const raw = this.readMetadataString(conversation.metadata, 'claimExpiresAt');
    if (!raw) return null;
    const value = new Date(raw);
    return Number.isNaN(value.getTime()) ? null : value;
  }

  private toMessagingMessageType(type?: 'text' | 'image' | 'file'): MessagingMessageType {
    if (type === 'image') return MessagingMessageType.IMAGE;
    if (type === 'file') return MessagingMessageType.FILE;
    return MessagingMessageType.TEXT;
  }

  private fromMessagingMessageType(type: MessagingMessageType): ChatbotMessage['messageType'] {
    if (type === MessagingMessageType.IMAGE) return 'image';
    if (type === MessagingMessageType.FILE) return 'file';
    return 'text';
  }

  private fromMessagingSender(message: MessagingMessage): ChatbotSender {
    if (message.direction === MessagingMessageDirection.INBOUND) return 'user';
    if (message.metadata?.autoReply) return 'bot';
    if (message.senderType === MessagingSenderType.STAFF) return 'staff';
    return 'system';
  }

  private messageTypePreview(messageType?: MessagingMessageType): string {
    if (messageType === MessagingMessageType.IMAGE) return '[Hình ảnh]';
    if (messageType === MessagingMessageType.FILE) return '[Tệp đính kèm]';
    return '[Nội dung chưa hỗ trợ]';
  }

  private readMetadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
    const value = metadata?.[key];
    if (typeof value === 'number') return String(value);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private async resolveFileUrl(value: string): Promise<string> {
    if (/^https?:\/\//i.test(value)) return value;

    try {
      return this.uploadsService.createPublicUrl(value);
    } catch {
      return value;
    }
  }

  private shouldHandoffToStaff(input: string): boolean {
    const message = input.toLowerCase();
    return this.includesAny(message, [
      'gặp bác sĩ',
      'gặp bsi',
      'bác sĩ tư vấn',
      'tư vấn viên',
      'gặp tư vấn',
      'nhân viên tư vấn',
      'người thật',
      'staff',
      'doctor',
      'consultant',
      'supporter',
    ]);
  }

  private buildBotReply(input: string, hasImage = false): string {
    if (hasImage) {
      return 'Mình đã nhận được ảnh, nhưng AI hiện chưa đọc được nội dung ảnh này. Nếu đây là ảnh y tế/kết quả khám/triệu chứng, bạn hãy bấm “Gặp tư vấn viên/bác sĩ” để bác sĩ xem và tư vấn an toàn hơn nhé.';
    }

    const message = input.toLowerCase();

    if (this.includesAny(message, ['lịch', 'khám', 'hẹn', 'appointment', 'schedule'])) {
      return 'Bạn có thể vào mục [Lịch khám](/schedule) để xem lịch hiện tại hoặc đặt lịch mới. Nếu muốn đổi lịch sát giờ khám, hãy gọi trực tiếp cơ sở để được hỗ trợ nhanh hơn.';
    }
    if (this.includesAny(message, ['hồ sơ', 'thai kỳ', 'chỉ số', 'record', 'profile'])) {
      return 'Bạn có thể theo dõi trong mục [Hồ sơ thai kỳ](/record-keeping). Hãy cập nhật chỉ số sau mỗi lần khám để bác sĩ có thêm dữ liệu tham khảo.';
    }
    if (this.includesAny(message, ['dịch vụ', 'gói', 'giá', 'package', 'service'])) {
      return 'Bạn có thể xem [Dịch vụ](/#services) và [Gói thai sản](/#packages) trên trang chủ. Giá/lịch có thể khác nhau theo từng cơ sở, nên bạn cần chọn cơ sở để xem thông tin chính xác.';
    }
    if (this.includesAny(message, ['cấp cứu', 'khẩn cấp', 'đau bụng', 'ra máu', 'emergency'])) {
      return 'Nếu có dấu hiệu khẩn cấp như đau bụng dữ dội, ra máu, khó thở hoặc thai máy bất thường, vui lòng gọi cấp cứu hoặc đến cơ sở y tế gần nhất ngay.';
    }
    if (this.includesAny(message, ['kê đơn', 'đơn thuốc', 'uống thuốc', 'liều', 'bị ho', 'thuốc gì', 'toa thuốc'])) {
      return 'Mình không thể kê đơn hoặc chỉ định thuốc thay bác sĩ. Bạn hãy bấm nút “Gặp tư vấn viên/bác sĩ” trong khung chat này để được bác sĩ hỗ trợ an toàn hơn nhé.';
    }
    if (this.includesAny(message, ['liên hệ', 'hotline', 'số điện thoại', 'support'])) {
      return 'Bạn có thể liên hệ cơ sở đã chọn qua thông tin trên website. Nếu chưa chọn cơ sở, hãy xem [Dịch vụ](/#services) hoặc bấm “Gặp tư vấn viên/bác sĩ” trong khung chat để được hỗ trợ.';
    }

    return FALLBACK_REPLY;
  }

  private includesAny(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword));
  }
}
