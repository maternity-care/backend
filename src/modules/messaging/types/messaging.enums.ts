export enum MessagingChannel {
  ZALO_PERSONAL = 'zalo_personal',
  ZALO_OA = 'zalo_oa',
  FACEBOOK_PAGE = 'facebook_page',
  WEB_CHAT = 'web_chat',
}

export enum MessagingAccountStatus {
  DISABLED = 'disabled',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export enum MessagingConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  CLOSED = 'closed',
}

export enum MessagingMessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessagingSenderType {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  SYSTEM = 'system',
}

export enum MessagingMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  STICKER = 'sticker',
  UNSUPPORTED = 'unsupported',
}

export enum MessagingImportFormat {
  ZALO_EXTRACTOR = 'zalo_extractor',
  WEB_CHAT = 'web_chat',
}
