import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationStatus } from '../../common/constants/status.enum';
import { UploadsService } from '../uploads/uploads.service';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
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
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly uploadsService: UploadsService,
    private readonly geminiChatbotService: GeminiChatbotService,
  ) {}

  async startConversation(conversationId?: string, requester?: ChatbotRequester): Promise<ChatbotConversationPayload> {
    let conversation = conversationId
      ? await this.conversationRepository.findOne({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await this.conversationRepository.save(
        this.conversationRepository.create({
          doctorId: null,
          facilityId: requester?.activeFacilityId ?? requester?.facilities?.[0]?.id ?? null,
          userId: requester?.id ?? null,
          guestKey: requester?.id ? null : this.normalizeGuestKey(requester),
          conversationType: 'chatbot',
          chatbotStatus: 'bot',
          priority: 0,
          status: ConversationStatus.OPEN,
          requesterMetadata: this.sanitizeRequester(requester),
        }),
      );
      await this.createMessage(conversation.id, 'bot', DEFAULT_WELCOME_MESSAGE);
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
    const wasClosed = conversation.chatbotStatus === 'closed';

    if (wasClosed) {
      conversation.chatbotStatus = 'waiting_for_staff';
      conversation = await this.clearAssignment(conversation);
    }

    if (payload.requestStaff) {
      const alreadyWaiting = !wasClosed && conversation.chatbotStatus !== 'bot';
      conversation.chatbotStatus = 'waiting_for_staff';
      conversation = await this.clearAssignment(conversation);

      if (!alreadyWaiting) {
        await this.createMessage(
          conversation.id,
          'system',
          'Mình đã chuyển cuộc trò chuyện này đến tư vấn viên/bác sĩ. Bạn chờ một chút nhé.',
        );
      }

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
      conversation.chatbotStatus = 'waiting_for_staff';
      conversation = await this.clearAssignment(conversation);
      await this.createMessage(
        conversation.id,
        'system',
        'Mình đã chuyển cuộc trò chuyện này đến tư vấn viên/bác sĩ. Bạn chờ một chút nhé.',
      );
      shouldNotifyStaff = true;
    } else if (conversation.chatbotStatus === 'waiting_for_staff' || conversation.chatbotStatus === 'staff_joined') {
      shouldNotifyStaff = !conversation.assignedStaffId;
    } else if (content || geminiReadableFiles.length > 0) {
      const recentMessages = await this.getLatestMessageEntities(conversation.id, 8);
      const geminiReply = await this.geminiChatbotService.generateReplyWithFiles(
        content ?? '',
        recentMessages.map((message) => this.mapMessageForPrompt(message)),
        geminiReadableFiles,
      );
      await this.createMessage(
        conversation.id,
        'bot',
        geminiReply || this.buildBotReply(content ?? '', geminiReadableFiles.length > 0),
      );
    }

    return {
      conversation: await this.getConversation(conversation.id),
      shouldNotifyStaff,
    };
  }

  async receiveStaffMessage(payload: StaffChatbotMessagePayload): Promise<ChatbotConversationPayload> {
    if (!payload.conversationId) {
      return this.startConversation(undefined);
    }

    let conversation = await this.ensureConversation(payload.conversationId);
    const content = payload.content?.trim();
    const hasFile = Boolean(payload.fileUrl);

    if (!content && !hasFile) {
      return this.getConversation(conversation.id);
    }

    const staffName = payload.staffName?.trim() || 'Tư vấn viên';
    const staffId = payload.staffId?.trim() || staffName;

    if (conversation.assignedStaffId && conversation.assignedStaffId !== staffId) {
      return this.getConversation(conversation.id);
    }

    conversation.chatbotStatus = 'staff_joined';
    conversation.assignedStaffId = staffId;
    conversation.assignedStaffName = staffName;
    conversation.claimExpiresAt = null;
    conversation = await this.conversationRepository.save(conversation);

    await this.createMessage(conversation.id, 'staff', content ?? '', {
      senderId: /^\d+$/.test(staffId) ? staffId : undefined,
      senderName: staffName,
      messageType: payload.messageType ?? (payload.fileUrl ? 'file' : 'text'),
      fileUrl: payload.fileKey ?? payload.fileUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
    });

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

    conversation.chatbotStatus = 'staff_joined';
    conversation.assignedStaffId = staffId;
    conversation.assignedStaffName = staffName;
    conversation.claimExpiresAt = expiresAt;
    conversation = await this.conversationRepository.save(conversation);

    if (!wasAssigned) {
      await this.createMessage(
        conversation.id,
        'system',
        `${staffName} đang nhận tư vấn cuộc trò chuyện này.`,
      );
    }

    return {
      conversation: await this.getConversation(conversation.id),
      claimed: !wasAssigned,
      claimExpiresAt: expiresAt,
    };
  }

  async releaseClaimIfNoReply(conversationId: string): Promise<ChatbotConversationPayload | null> {
    let conversation = await this.conversationRepository.findOne({ where: { id: conversationId } });
    if (!conversation?.claimExpiresAt) return null;

    const assignedStaffName = conversation.assignedStaffName || 'Tư vấn viên';
    conversation.chatbotStatus = 'waiting_for_staff';
    conversation = await this.clearAssignment(conversation);

    await this.createMessage(
      conversationId,
      'system',
      `${assignedStaffName} chưa phản hồi sau 5 phút, cuộc chat đã được mở lại cho bác sĩ/tư vấn viên khác.`,
    );

    return this.getConversation(conversationId);
  }

  async closeConversationForUserIdle(conversationId: string): Promise<ChatbotConversationPayload> {
    let conversation = await this.ensureConversation(conversationId);
    if (conversation.chatbotStatus === 'bot' || conversation.chatbotStatus === 'closed') {
      return this.getConversation(conversation.id);
    }

    const assignedStaffName = conversation.assignedStaffName || 'Tư vấn viên';
    const hadAssignedStaff = Boolean(conversation.assignedStaffId);

    conversation.chatbotStatus = 'closed';
    conversation.status = ConversationStatus.CLOSED;
    conversation = await this.clearAssignment(conversation);

    await this.createMessage(
      conversation.id,
      'system',
      hadAssignedStaff
        ? `${assignedStaffName} đã rời cuộc trò chuyện vì bạn không phản hồi trong 5 phút. Nếu cần hỗ trợ tiếp, hãy nhắn lại để hệ thống phân tư vấn viên/bác sĩ mới.`
        : 'Cuộc trò chuyện đã đóng vì bạn đã ngắt kết nối quá 5 phút. Nếu cần hỗ trợ tiếp, hãy nhắn lại để hệ thống phân tư vấn viên/bác sĩ mới.',
    );

    return this.getConversation(conversation.id);
  }

  async getStaffQueue(): Promise<ChatbotConversationPayload[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.chatbotStatus NOT IN (:...hidden)', { hidden: ['bot', 'closed'] })
      .orderBy('conversation.updatedAt', 'DESC')
      .take(50)
      .getMany();

    return Promise.all(conversations.map((conversation) => this.getConversation(conversation.id, 1)));
  }

  async closeInactiveSupportConversations(activeConversationIds: string[]): Promise<void> {
    const cutoff = new Date(Date.now() - USER_IDLE_TIMEOUT_MS);
    const query = this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.chatbotStatus NOT IN (:...hidden)', { hidden: ['bot', 'closed'] })
      .andWhere('conversation.updatedAt < :cutoff', { cutoff });

    if (activeConversationIds.length > 0) {
      query.andWhere('conversation.id NOT IN (:...activeConversationIds)', {
        activeConversationIds,
      });
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
      status: conversation.chatbotStatus as ChatbotConversationPayload['status'],
      requester: conversation.requesterMetadata as ChatbotRequester | undefined,
      assignedStaffId: conversation.assignedStaffId ?? undefined,
      assignedStaffName: conversation.assignedStaffName ?? undefined,
      claimExpiresAt: conversation.claimExpiresAt?.toISOString(),
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

  private async ensureConversation(conversationId?: string, requester?: ChatbotRequester): Promise<ChatConversation> {
    const conversation = await this.findReusableConversation(conversationId, requester);
    if (conversation) {
      return requester ? this.updateRequester(conversation, requester) : conversation;
    }

    const created = await this.startConversation(undefined, requester);
    return this.conversationRepository.findOneOrFail({ where: { id: created.conversationId } });
  }

  private async findReusableConversation(
    conversationId?: string,
    requester?: ChatbotRequester,
  ): Promise<ChatConversation | null> {
    const byId = conversationId
      ? await this.conversationRepository.findOne({ where: { id: conversationId } })
      : null;

    if (requester?.id) {
      if (byId && (!byId.userId || byId.userId === requester.id)) {
        return byId;
      }

      return this.conversationRepository.findOne({
        where: {
          userId: requester.id,
          conversationType: 'chatbot',
        },
        order: { updatedAt: 'DESC', id: 'DESC' },
      });
    }

    const guestKey = this.normalizeGuestKey(requester);
    if (guestKey) {
      if (byId && !byId.userId && byId.guestKey === guestKey) {
        return byId;
      }

      return this.conversationRepository.findOne({
        where: {
          guestKey,
          conversationType: 'chatbot',
        },
        order: { updatedAt: 'DESC', id: 'DESC' },
      });
    }

    return byId;
  }

  private async updateRequester(
    conversation: ChatConversation,
    requester: ChatbotRequester,
  ): Promise<ChatConversation> {
    conversation.userId = requester.id ?? conversation.userId;
    conversation.guestKey = requester.id ? null : this.normalizeGuestKey(requester) ?? conversation.guestKey;
    conversation.facilityId =
      requester.activeFacilityId ?? requester.facilities?.[0]?.id ?? conversation.facilityId;
    conversation.requesterMetadata = this.sanitizeRequester(requester);
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

  private async clearAssignment(conversation: ChatConversation): Promise<ChatConversation> {
    conversation.assignedStaffId = null;
    conversation.assignedStaffName = null;
    conversation.claimExpiresAt = null;
    return this.conversationRepository.save(conversation);
  }

  private getGeminiReadableFiles(payload: ChatbotMessagePayload): Array<{ url: string; mimeType: string }> {
    if (
      payload.messageType !== 'image' ||
      !payload.fileUrl ||
      !payload.mimeType?.toLowerCase().startsWith('image/')
    ) {
      return [];
    }

    const urls = [payload.aiFileUrl, payload.fileUrl].filter(
      (url): url is string => Boolean(url?.trim()),
    );

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
  ): Promise<ChatMessage> {
    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId,
        senderId: options.senderId && /^\d+$/.test(options.senderId) ? options.senderId : null,
        senderType: sender,
        senderName: options.senderName ?? null,
        messageType: options.messageType ?? 'text',
        content,
        fileUrl: options.fileUrl ?? null,
        fileName: options.fileName ?? null,
        mimeType: options.mimeType ?? null,
        fileSize: options.fileSize ?? null,
        readAt: null,
      }),
    );
    await this.conversationRepository.update(conversationId, { updatedAt: new Date() });
    return message;
  }

  private async getLatestMessageEntities(conversationId: string, limit: number): Promise<ChatMessage[]> {
    const rows = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  private async mapMessages(messages: ChatMessage[]): Promise<ChatbotMessage[]> {
    return Promise.all(messages.map((message) => this.mapMessage(message)));
  }

  private async mapMessage(message: ChatMessage): Promise<ChatbotMessage> {
    const fileUrl = message.fileUrl
      ? await this.resolveFileUrl(message.fileUrl)
      : null;

    return {
      id: message.id,
      conversationId: message.conversationId,
      sender: message.senderType,
      senderName: message.senderName ?? undefined,
      messageType: (message.messageType as ChatbotMessage['messageType']) ?? 'text',
      content: message.content ?? '',
      fileUrl,
      fileName: message.fileName,
      mimeType: message.mimeType,
      fileSize: message.fileSize,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private mapMessageForPrompt(message: ChatMessage): ChatbotMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      sender: message.senderType,
      senderName: message.senderName ?? undefined,
      messageType: (message.messageType as ChatbotMessage['messageType']) ?? 'text',
      content: message.content ?? '',
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      mimeType: message.mimeType,
      fileSize: message.fileSize,
      createdAt: message.createdAt.toISOString(),
    };
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
