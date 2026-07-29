export type ChatbotSender = 'user' | 'bot' | 'staff' | 'system';
export type ChatbotConversationStatus = 'bot' | 'waiting_for_staff' | 'staff_joined' | 'closed';

export interface ChatbotMessage {
  id: string;
  conversationId: string;
  sender: ChatbotSender;
  messageType: 'text' | 'image' | 'file';
  content: string;
  senderName?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

export interface ChatbotMessagePayload {
  conversationId?: string;
  content?: string;
  requestStaff?: boolean;
  requester?: ChatbotRequester;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string;
  aiFileUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  fileKey?: string;
}

export interface ChatbotConversationPayload {
  conversationId: string;
  status: ChatbotConversationStatus;
  requester?: ChatbotRequester;
  assignedStaffId?: string;
  assignedStaffName?: string;
  claimExpiresAt?: string;
  messages: ChatbotMessage[];
  hasMoreMessages?: boolean;
}

export interface StaffChatbotMessagePayload extends ChatbotMessagePayload {
  staffId?: string;
  staffName?: string;
}

export interface ChatbotHistoryPayload {
  conversationId?: string;
  beforeMessageId?: string;
  limit?: number;
}

export interface ChatbotHistoryResponse {
  conversationId: string;
  messages: ChatbotMessage[];
  hasMore: boolean;
}

export interface ChatbotRequester {
  id?: string;
  guestKey?: string;
  ipHash?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  activeFacilityId?: string | null;
  facilities?: Array<{
    id: string;
    name: string;
    code?: string;
    status?: string;
    address?: string;
  }>;
}
