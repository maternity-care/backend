import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ChatbotConversationStatus,
  ChatbotConversationPayload,
  ChatbotMessage,
  ChatbotMessagePayload,
  StaffChatbotMessagePayload,
} from './chatbot.types';

const DEFAULT_WELCOME_MESSAGE =
  'Xin chào mẹ bầu 🌸 Mình là trợ lý Maternity Care. Bạn có thể hỏi về lịch khám, hồ sơ thai kỳ, dịch vụ hoặc cách liên hệ nhân viên hỗ trợ.';

const FALLBACK_REPLY =
  'Mình đã ghi nhận câu hỏi của bạn. Với vấn đề y tế cụ thể hoặc tình huống khẩn cấp, bạn nên liên hệ bác sĩ/cơ sở y tế để được tư vấn chính xác nhé.';

const STAFF_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class ChatbotService {
  private readonly conversations = new Map<string, ChatbotMessage[]>();
  private readonly statuses = new Map<string, ChatbotConversationStatus>();
  private readonly assignedStaffIds = new Map<string, string>();
  private readonly assignedStaffNames = new Map<string, string>();
  private readonly claimExpiresAt = new Map<string, Date>();
  private readonly staffRepliedAfterClaim = new Map<string, boolean>();
  private readonly requesters = new Map<string, ChatbotConversationPayload['requester']>();

  startConversation(conversationId?: string): ChatbotConversationPayload {
    const id = conversationId || randomUUID();

    if (!this.conversations.has(id)) {
      this.conversations.set(id, [
        this.createMessage(id, 'bot', DEFAULT_WELCOME_MESSAGE),
      ]);
      this.statuses.set(id, 'bot');
    }

    return this.getConversation(id);
  }

  receiveUserMessage(payload: ChatbotMessagePayload): {
    conversation: ChatbotConversationPayload;
    shouldNotifyStaff: boolean;
  } {
    const content = payload.content?.trim();
    const conversation = this.startConversation(payload.conversationId);
    this.rememberRequester(conversation.conversationId, payload.requester);

    if (payload.requestStaff) {
      const messages = this.conversations.get(conversation.conversationId) ?? [];
      const alreadyWaiting = this.statuses.get(conversation.conversationId) !== 'bot';

      this.statuses.set(conversation.conversationId, 'waiting_for_staff');
      this.clearAssignment(conversation.conversationId);

      if (!alreadyWaiting) {
        messages.push(
          this.createMessage(
            conversation.conversationId,
            'system',
            'Mình đã chuyển cuộc trò chuyện này đến tư vấn viên/bác sĩ. Bạn chờ một chút nhé.',
          ),
        );
        this.conversations.set(conversation.conversationId, messages);
      }

      return {
        conversation: this.getConversation(conversation.conversationId),
        shouldNotifyStaff: true,
      };
    }

    if (!content) {
      return { conversation, shouldNotifyStaff: false };
    }

    const messages = this.conversations.get(conversation.conversationId) ?? [];
    messages.push(this.createMessage(conversation.conversationId, 'user', content));

    let shouldNotifyStaff = false;
    const currentStatus = this.statuses.get(conversation.conversationId) ?? 'bot';

    if (this.shouldHandoffToStaff(content)) {
      this.statuses.set(conversation.conversationId, 'waiting_for_staff');
      this.clearAssignment(conversation.conversationId);
      messages.push(
        this.createMessage(
          conversation.conversationId,
          'system',
          'Mình đã chuyển cuộc trò chuyện này đến tư vấn viên/bác sĩ. Bạn chờ một chút nhé.',
        ),
      );
      shouldNotifyStaff = true;
    } else if (currentStatus === 'waiting_for_staff' || currentStatus === 'staff_joined') {
      shouldNotifyStaff = !this.assignedStaffIds.has(conversation.conversationId);
    } else {
      messages.push(
        this.createMessage(conversation.conversationId, 'bot', this.buildBotReply(content)),
      );
    }

    this.conversations.set(conversation.conversationId, messages);

    return {
      conversation: this.getConversation(conversation.conversationId),
      shouldNotifyStaff,
    };
  }

  receiveStaffMessage(payload: StaffChatbotMessagePayload): ChatbotConversationPayload {
    const content = payload.content?.trim();
    const conversation = this.startConversation(payload.conversationId);

    if (!content) {
      return conversation;
    }

    const staffName = payload.staffName?.trim() || 'Tư vấn viên';
    const staffId = payload.staffId?.trim() || staffName;
    const messages = this.conversations.get(conversation.conversationId) ?? [];

    const assignedStaffId = this.assignedStaffIds.get(conversation.conversationId);
    if (assignedStaffId && assignedStaffId !== staffId) {
      return this.getConversation(conversation.conversationId);
    }

    this.statuses.set(conversation.conversationId, 'staff_joined');
    this.assignedStaffIds.set(conversation.conversationId, staffId);
    this.assignedStaffNames.set(conversation.conversationId, staffName);
    this.staffRepliedAfterClaim.set(conversation.conversationId, true);
    this.claimExpiresAt.delete(conversation.conversationId);
    messages.push(
      this.createMessage(conversation.conversationId, 'staff', content, staffName),
    );
    this.conversations.set(conversation.conversationId, messages);

    return this.getConversation(conversation.conversationId);
  }

  claimConversation(payload: StaffChatbotMessagePayload): {
    conversation: ChatbotConversationPayload;
    claimed: boolean;
    claimExpiresAt?: Date;
  } {
    const conversation = this.startConversation(payload.conversationId);
    const staffName = payload.staffName?.trim() || 'Tư vấn viên';
    const staffId = payload.staffId?.trim() || staffName;
    const assignedStaffId = this.assignedStaffIds.get(conversation.conversationId);

    if (assignedStaffId && assignedStaffId !== staffId) {
      return { conversation, claimed: false };
    }

    const expiresAt = new Date(Date.now() + STAFF_CLAIM_TIMEOUT_MS);
    const wasAssigned = this.assignedStaffIds.has(conversation.conversationId);

    this.statuses.set(conversation.conversationId, 'staff_joined');
    this.assignedStaffIds.set(conversation.conversationId, staffId);
    this.assignedStaffNames.set(conversation.conversationId, staffName);
    this.claimExpiresAt.set(conversation.conversationId, expiresAt);
    this.staffRepliedAfterClaim.set(conversation.conversationId, false);

    if (!wasAssigned) {
      const messages = this.conversations.get(conversation.conversationId) ?? [];
      messages.push(
        this.createMessage(
          conversation.conversationId,
          'system',
          `${staffName} đang nhận tư vấn cuộc trò chuyện này.`,
        ),
      );
      this.conversations.set(conversation.conversationId, messages);
    }

    return {
      conversation: this.getConversation(conversation.conversationId),
      claimed: !wasAssigned,
      claimExpiresAt: expiresAt,
    };
  }

  releaseClaimIfNoReply(conversationId: string): ChatbotConversationPayload | null {
    if (this.staffRepliedAfterClaim.get(conversationId)) {
      return null;
    }

    const assignedStaffName = this.assignedStaffNames.get(conversationId) || 'Tư vấn viên';
    this.statuses.set(conversationId, 'waiting_for_staff');
    this.clearAssignment(conversationId);

    const messages = this.conversations.get(conversationId) ?? [];
    messages.push(
      this.createMessage(
        conversationId,
        'system',
        `${assignedStaffName} chưa phản hồi sau 5 phút, cuộc chat đã được mở lại cho bác sĩ/tư vấn viên khác.`,
      ),
    );
    this.conversations.set(conversationId, messages);

    return this.getConversation(conversationId);
  }

  getStaffQueue(): ChatbotConversationPayload[] {
    return [...this.conversations.keys()]
      .map((conversationId) => this.getConversation(conversationId))
      .filter((conversation) => conversation.status !== 'bot')
      .sort((a, b) => {
        const aLast = a.messages.at(-1)?.createdAt ?? '';
        const bLast = b.messages.at(-1)?.createdAt ?? '';
        return bLast.localeCompare(aLast);
      });
  }

  getConversation(conversationId: string): ChatbotConversationPayload {
    const expiresAt = this.claimExpiresAt.get(conversationId);

    return {
      conversationId,
      status: this.statuses.get(conversationId) ?? 'bot',
      requester: this.requesters.get(conversationId),
      assignedStaffId: this.assignedStaffIds.get(conversationId),
      assignedStaffName: this.assignedStaffNames.get(conversationId),
      claimExpiresAt: expiresAt?.toISOString(),
      messages: this.conversations.get(conversationId) ?? [],
    };
  }

  private clearAssignment(conversationId: string): void {
    this.assignedStaffIds.delete(conversationId);
    this.assignedStaffNames.delete(conversationId);
    this.claimExpiresAt.delete(conversationId);
    this.staffRepliedAfterClaim.delete(conversationId);
  }

  private rememberRequester(
    conversationId: string,
    requester: ChatbotConversationPayload['requester'],
  ): void {
    if (!requester) return;

    this.requesters.set(conversationId, {
      id: requester.id,
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
    });
  }

  private createMessage(
    conversationId: string,
    sender: ChatbotMessage['sender'],
    content: string,
    senderName?: string,
  ): ChatbotMessage {
    return {
      id: randomUUID(),
      conversationId,
      sender,
      content,
      senderName,
      createdAt: new Date().toISOString(),
    };
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

  private buildBotReply(input: string): string {
    const message = input.toLowerCase();

    if (this.includesAny(message, ['lịch', 'khám', 'hẹn', 'appointment', 'schedule'])) {
      return 'Bạn có thể vào mục “Lịch khám” để xem lịch hiện tại hoặc đặt lịch mới. Nếu muốn đổi lịch sát giờ khám, hãy gọi trực tiếp cơ sở để được hỗ trợ nhanh hơn.';
    }

    if (this.includesAny(message, ['hồ sơ', 'thai kỳ', 'chỉ số', 'record', 'profile'])) {
      return 'Bạn có thể theo dõi hồ sơ thai kỳ trong mục “Hồ sơ / Theo dõi”. Hãy cập nhật chỉ số sau mỗi lần khám để bác sĩ có thêm dữ liệu tham khảo.';
    }

    if (this.includesAny(message, ['dịch vụ', 'gói', 'giá', 'package', 'service'])) {
      return 'Các dịch vụ và gói thai sản sẽ hiển thị theo từng cơ sở. Bạn nên chọn cơ sở trước để xem đúng giá, lịch và dịch vụ đang khả dụng.';
    }

    if (this.includesAny(message, ['cấp cứu', 'khẩn cấp', 'đau bụng', 'ra máu', 'emergency'])) {
      return 'Nếu có dấu hiệu khẩn cấp như đau bụng dữ dội, ra máu, khó thở hoặc thai máy bất thường, vui lòng gọi cấp cứu hoặc đến cơ sở y tế gần nhất ngay.';
    }

    if (this.includesAny(message, ['liên hệ', 'hotline', 'số điện thoại', 'support'])) {
      return 'Bạn có thể liên hệ cơ sở đã chọn qua thông tin trên website. Nếu chưa chọn cơ sở, hãy vào trang dịch vụ/cơ sở để xem kênh liên hệ phù hợp.';
    }

    return FALLBACK_REPLY;
  }

  private includesAny(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword));
  }
}
