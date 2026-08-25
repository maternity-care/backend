import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessagingService } from '../messaging.service';
import { GeminiChatbotService } from '../../chatbot/gemini-chatbot.service';
import {
  MessagingAccountStatus,
  MessagingChannel,
  MessagingMessageType,
} from '../types/messaging.enums';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';

type FacebookPageCredentials = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  verifyToken?: string | null;
};

type FacebookAttachmentInput = {
  url: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type FacebookQuickReplyInput = {
  title: string;
  payload: string;
};

type FacebookOAuthPage = {
  id: string;
  name: string;
  accessToken: string;
  tasks?: string[];
};

type FacebookOAuthSession = {
  id: string;
  state: string;
  pages: FacebookOAuthPage[];
  expiresAt: number;
};

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const OAUTH_SESSION_TTL_MS = 10 * 60 * 1000;
const FACEBOOK_TEXT_CHUNK_SIZE = 1800;
const FACEBOOK_SEND_TIMEOUT_MS = 15000;

@Injectable()
export class FacebookPageRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(FacebookPageRuntimeService.name);
  private readonly oauthSessions = new Map<string, FacebookOAuthSession>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly geminiChatbotService: GeminiChatbotService,
  ) {}

  async onModuleInit(): Promise<void> {
    const accounts = await this.messagingService.listAccounts();
    await Promise.all(
      accounts
        .filter((account) => account.channel === MessagingChannel.FACEBOOK_PAGE && account.autoStart)
        .map((account) => this.start(account.id).catch((error) => {
          this.logger.warn(`Cannot auto-start Facebook Page account ${account.id}: ${this.getErrorMessage(error)}`);
        })),
    );
  }

  async start(accountId: string): Promise<void> {
    const account = await this.messagingService.getAccountForRuntime(accountId);
    if (account.channel !== MessagingChannel.FACEBOOK_PAGE) return;
    const credentials = this.readCredentials(account.credentials);
    await this.subscribePage(credentials);
    await this.messagingService.setAccountAutoStart(accountId, true);
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTED);
  }

  createOAuthUrl(redirectUri: string): { url: string; state: string } {
    const appId = this.readFacebookAppId();
    const cleanRedirectUri = this.readString(redirectUri);
    if (!cleanRedirectUri) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_REDIRECT_URI_REQUIRED);
    }
    const state = randomUUID();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: cleanRedirectUri,
      state,
      response_type: 'code',
    });
    const loginConfigId = this.readString(process.env.FACEBOOK_LOGIN_CONFIG_ID);
    if (!loginConfigId) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_LOGIN_CONFIG_REQUIRED);
    }
    params.set('config_id', loginConfigId);
    params.set('override_default_response_type', 'true');
    return {
      state,
      url: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`,
    };
  }

  async exchangeOAuthCode(input: {
    code: string;
    redirectUri: string;
    state: string;
  }): Promise<{
    sessionId: string;
    pages: Array<{ id: string; name: string; tasks?: string[] }>;
  }> {
    const appId = this.readFacebookAppId();
    const appSecret = this.readFacebookAppSecret();
    const code = this.readString(input.code);
    const redirectUri = this.readString(input.redirectUri);
    const state = this.readString(input.state);
    if (!code || !redirectUri || !state) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_OAUTH_PAYLOAD_INVALID);
    }

    const tokenResponse = await this.graphGet('/oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const userToken = this.readString((tokenResponse as Record<string, unknown>)?.access_token);
    if (!userToken) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_USER_TOKEN_FAILED);
    }

    const longLivedResponse = await this.graphGet('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: userToken,
    }).catch(() => tokenResponse);
    const longLivedUserToken = this.readString((longLivedResponse as Record<string, unknown>)?.access_token) || userToken;

    const pagesResponse = await this.graphGet('/me/accounts', {
      fields: 'id,name,access_token,tasks',
      access_token: longLivedUserToken,
    });
    const pages = this.normalizeOAuthPages(pagesResponse);
    if (pages.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_PAGE_EMPTY);
    }

    const sessionId = randomUUID();
    this.oauthSessions.set(sessionId, {
      id: sessionId,
      state,
      pages,
      expiresAt: Date.now() + OAUTH_SESSION_TTL_MS,
    });
    this.pruneOAuthSessions();

    return {
      sessionId,
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        tasks: page.tasks,
      })),
    };
  }

  async connectOAuthPage(input: {
    sessionId: string;
    pageId: string;
    verifyToken?: string;
    autoStart?: boolean;
  }) {
    this.pruneOAuthSessions();
    const sessionId = this.readString(input.sessionId);
    const pageId = this.readString(input.pageId);
    const session = this.oauthSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_SESSION_EXPIRED);
    }
    const page = session.pages.find((item) => item.id === pageId);
    if (!page) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_PAGE_NOT_FOUND);
    }

    const account = await this.messagingService.createFacebookPageAccount({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.accessToken,
      verifyToken: this.readString(input.verifyToken) || undefined,
      autoStart: input.autoStart,
    });
    this.oauthSessions.delete(sessionId);
    if (input.autoStart) await this.start(account.id);
    return account;
  }

  async stop(accountId: string): Promise<void> {
    const account = await this.messagingService.getAccountForRuntime(accountId);
    if (account.channel !== MessagingChannel.FACEBOOK_PAGE) return;
    await this.messagingService.setAccountAutoStart(accountId, false);
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.DISCONNECTED);
  }

  async sendMessage(
    accountId: string,
    recipientId: string,
    content: string,
    attachment?: FacebookAttachmentInput | null,
    quickReplies: FacebookQuickReplyInput[] = [],
  ): Promise<unknown> {
    const account = await this.messagingService.getAccountForRuntime(accountId);
    const credentials = this.readCredentials(account.credentials);
    const responses: unknown[] = [];
    const cleanContent = this.normalizeExternalText(content);

    if (cleanContent) {
      const chunks = this.splitText(cleanContent, FACEBOOK_TEXT_CHUNK_SIZE);
      for (const [index, text] of chunks.entries()) {
        const isLastTextChunk = index === chunks.length - 1;
        responses.push(await this.sendGraphMessage(credentials, recipientId, {
          recipient: { id: recipientId },
          messaging_type: 'RESPONSE',
          message: {
            text,
            ...(isLastTextChunk && quickReplies.length > 0
              ? {
                quick_replies: quickReplies.slice(0, 11).map((reply) => ({
                  content_type: 'text',
                  title: reply.title.slice(0, 20),
                  payload: reply.payload,
                })),
              }
              : {}),
          },
        }));
      }
    }

    if (attachment?.url) {
      const attachmentType = attachment.mimeType?.startsWith('image/') ? 'image' : 'file';
      responses.push(await this.sendGraphMessage(credentials, recipientId, {
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: {
          attachment: {
            type: attachmentType,
            payload: {
              url: attachment.url,
              is_reusable: true,
            },
          },
        },
      }));
    }

    if (responses.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_SEND_CONTENT_REQUIRED);
    }

    return responses.length === 1 ? responses[0] : { responses };
  }

  async handleWebhook(body: unknown): Promise<void> {
    if (!body || typeof body !== 'object') return;
    const payload = body as { object?: unknown; entry?: unknown };
    if (payload.object !== 'page' || !Array.isArray(payload.entry)) return;

    for (const entry of payload.entry) {
      const entryObject = entry as { id?: unknown; messaging?: unknown };
      const pageId = this.readString(entryObject.id);
      const account = await this.messagingService.findFacebookPageAccount(pageId);
      if (!account) {
        this.logger.warn(`Skip Facebook webhook for unknown page ${pageId || 'unknown'}`);
        continue;
      }
      if (account.status !== MessagingAccountStatus.CONNECTED) {
        this.logger.debug(`Skip Facebook webhook for stopped page ${pageId}`);
        continue;
      }

      const credentials = this.readCredentials(account.credentials);
      const events = Array.isArray(entryObject.messaging) ? entryObject.messaging : [];
      for (const event of events) {
        await this.handleMessagingEvent(account.id, credentials, event);
      }
    }
  }

  async verifyWebhook(mode?: string, token?: string, challenge?: string): Promise<string> {
    if (mode !== 'subscribe' || !token || !challenge) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_WEBHOOK_PAYLOAD_INVALID);
    }

    const configuredToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    if (configuredToken && configuredToken === token) return challenge;
    if (await this.messagingService.hasFacebookVerifyToken(token)) return challenge;

    throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_WEBHOOK_TOKEN_MISMATCH);
  }

  private async handleMessagingEvent(
    accountId: string,
    credentials: FacebookPageCredentials,
    rawEvent: unknown,
  ): Promise<void> {
    if (!rawEvent || typeof rawEvent !== 'object') return;
    const event = rawEvent as {
      sender?: { id?: unknown };
      recipient?: { id?: unknown };
      timestamp?: unknown;
      message?: {
        mid?: unknown;
        text?: unknown;
        is_echo?: unknown;
        attachments?: unknown;
        quick_reply?: { payload?: unknown };
      };
      postback?: {
        title?: unknown;
        payload?: unknown;
      };
    };
    if (event.message?.is_echo) return;

    const senderId = this.readString(event.sender?.id);
    if (!senderId) return;

    const profile = await this.fetchUserProfile(credentials, senderId);
    const attachments = Array.isArray(event.message?.attachments) ? event.message?.attachments : [];
    const firstAttachment = attachments[0] as { type?: unknown; payload?: { url?: unknown } } | undefined;
    const attachmentUrl = this.readString(firstAttachment?.payload?.url) || null;
    const attachmentType = this.readString(firstAttachment?.type);
    const quickReplyPayload = this.readString(event.message?.quick_reply?.payload);
    const postbackPayload = this.readString(event.postback?.payload);
    const actionPayload = quickReplyPayload || postbackPayload || null;
    const text =
      this.readString(event.message?.text) ||
      this.readString(event.postback?.title) ||
      (actionPayload === 'REQUEST_STAFF_SUPPORT' ? 'Gặp tư vấn viên' : null);
    const messageType = attachmentUrl
      ? (attachmentType === 'image' ? MessagingMessageType.IMAGE : MessagingMessageType.FILE)
      : MessagingMessageType.TEXT;

    const result = await this.messagingService.recordIncoming({
      accountId,
      externalThreadId: senderId,
      externalThreadType: 'user',
      externalMessageId: this.readString(event.message?.mid) || null,
      senderId,
      senderName: profile.name || RESPONSE_MESSAGES.MESSAGING.FACEBOOK_CUSTOMER_FALLBACK_NAME,
      content: text || null,
      messageType,
      sentAt: typeof event.timestamp === 'number' ? new Date(event.timestamp) : new Date(),
      metadata: {
        source: 'facebook_page',
        pageId: credentials.pageId,
        customerAvatarUrl: profile.avatarUrl,
        facebookProfile: profile.raw,
        attachmentUrl,
        attachmentType: attachmentType || null,
        imageUrl: messageType === MessagingMessageType.IMAGE ? attachmentUrl : null,
        actionPayload,
        rawEvent: event,
      },
    });
    await this.maybeAutoReply(accountId, senderId, result.message);
  }

  private async maybeAutoReply(
    accountId: string,
    recipientId: string,
    message: { id: string; conversationId: string; content: string | null; messageType: MessagingMessageType; metadata: Record<string, unknown> | null },
  ): Promise<void> {
    if (!(await this.messagingService.shouldAutoReply(message.conversationId))) return;

    const history = await this.messagingService.buildAutoReplyHistory(message.conversationId);
    const imageUrl = this.readString(message.metadata?.imageUrl);
    const userMessage = this.readString(message.content) ||
      (message.messageType === MessagingMessageType.IMAGE ? 'Khách vừa gửi hình ảnh.' : 'Khách vừa gửi tin nhắn mới.');
    const files = imageUrl ? [{ url: imageUrl, mimeType: 'image/jpeg' }] : [];
    const reply = await this.geminiChatbotService.generateReplyWithFiles(userMessage, history, files, {
      channel: 'facebook_page',
      supportsButtons: true,
      supportsLinks: false,
    }) ||
      'Mình đã nhận được tin nhắn của bạn. Tư vấn viên/bác sĩ sẽ phản hồi sớm nhé.';
    const quickReplies = this.buildAiQuickReplies(reply);
    const outbound = await this.messagingService.recordAutoReplyOutbound({
      conversationId: message.conversationId,
      content: reply,
      reason: 'facebook_inbound_after_60m_or_no_reply',
    });

    try {
      const providerResponse = await this.sendMessage(accountId, recipientId, reply, null, quickReplies);
      await this.messagingService.updateOutboundDelivery(outbound.message.id, 'sent', null, providerResponse);
    } catch (error) {
      await this.messagingService.updateOutboundDelivery(
        outbound.message.id,
        'failed',
        this.getErrorMessage(error),
      );
      this.logger.warn(`Cannot send Facebook AI auto-reply: ${this.getErrorMessage(error)}`);
    }
  }

  private buildAiQuickReplies(_reply: string): FacebookQuickReplyInput[] {
    return [
      {
        title: 'Gặp tư vấn viên',
        payload: 'REQUEST_STAFF_SUPPORT',
      },
    ];
  }

  private async sendGraphMessage(
    credentials: FacebookPageCredentials,
    recipientId: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(credentials.pageId)}/messages`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credentials.pageAccessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FACEBOOK_SEND_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = this.extractGraphError(data) || `Facebook Graph API lỗi (${response.status}).`;
      throw new Error(message);
    }
    return data ?? { recipientId };
  }

  private splitText(content: string, maxLength: number): string[] {
    if (content.length <= maxLength) return [content];
    const chunks: string[] = [];
    let remaining = content.trim();
    while (remaining.length > maxLength) {
      const window = remaining.slice(0, maxLength);
      const splitAt = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
      const nextIndex = splitAt > Math.floor(maxLength * 0.6) ? splitAt : maxLength;
      chunks.push(remaining.slice(0, nextIndex).trim());
      remaining = remaining.slice(nextIndex).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  private normalizeExternalText(content: string): string {
    return content
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
        const cleanLabel = this.readString(label);
        const cleanUrl = this.readString(url);
        if (!cleanUrl) return cleanLabel;
        return cleanLabel ? `${cleanLabel}: ${cleanUrl}` : cleanUrl;
      })
      .replace(/[;,\s]*Email\s*:\s*[^;\n.]+(?:\.[^;\n.]+)+\.?/gi, '')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([;,.])/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async subscribePage(credentials: FacebookPageCredentials): Promise<void> {
    const fields = this.readString(process.env.FACEBOOK_SUBSCRIBED_FIELDS) ||
      'messages,messaging_postbacks,message_deliveries,message_reads';
    const params = new URLSearchParams({ subscribed_fields: fields });
    const response = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(credentials.pageId)}/subscribed_apps?${params.toString()}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credentials.pageAccessToken}`,
        'content-type': 'application/json',
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = this.extractGraphError(data) || `Không subscribe được Facebook Page webhook (${response.status}).`;
      throw new BadRequestException(message);
    }
  }

  private async graphGet(path: string, params: Record<string, string>): Promise<unknown> {
    const query = new URLSearchParams(params);
    const response = await fetch(`${GRAPH_BASE_URL}${path}?${query.toString()}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = this.extractGraphError(data) || `Facebook Graph API lỗi (${response.status}).`;
      throw new BadRequestException(message);
    }
    return data;
  }

  private async fetchUserProfile(
    credentials: FacebookPageCredentials,
    userId: string,
  ): Promise<{ name: string | null; avatarUrl: string | null; raw: unknown }> {
    try {
      const params = new URLSearchParams({
        fields: 'name,first_name,last_name,profile_pic,picture',
        access_token: credentials.pageAccessToken,
      });
      const response = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(userId)}?${params.toString()}`);
      const data = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!response.ok || !data) {
        const message = this.extractGraphError(data) || `Facebook User Profile API lỗi (${response.status}).`;
        this.logger.warn(`Cannot fetch Facebook user profile ${userId}: ${message}`);
        return { name: null, avatarUrl: null, raw: data };
      }
      const name = this.readString(data.name) || [this.readString(data.first_name), this.readString(data.last_name)]
        .filter(Boolean)
        .join(' ') || null;
      return {
        name,
        avatarUrl: this.readString(data.profile_pic) || this.readFacebookPictureUrl(data.picture) || null,
        raw: data,
      };
    } catch (error) {
      this.logger.warn(`Cannot fetch Facebook user profile ${userId}: ${this.getErrorMessage(error)}`);
      return { name: null, avatarUrl: null, raw: null };
    }
  }

  private readFacebookPictureUrl(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    const data = (value as { data?: unknown }).data;
    if (!data || typeof data !== 'object') return null;
    return this.readString((data as { url?: unknown }).url) || null;
  }

  private readCredentials(credentials: Record<string, unknown> | null): FacebookPageCredentials {
    const pageId = this.readString(credentials?.pageId);
    const pageName = this.readString(credentials?.pageName);
    const pageAccessToken = this.readString(credentials?.pageAccessToken);
    if (!pageId || !pageName || !pageAccessToken) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_CREDENTIALS_REQUIRED);
    }
    return {
      pageId,
      pageName,
      pageAccessToken,
      verifyToken: this.readString(credentials?.verifyToken) || null,
    };
  }

  private extractGraphError(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const error = (data as { error?: { message?: unknown } }).error;
    return this.readString(error?.message) || null;
  }

  private normalizeOAuthPages(data: unknown): FacebookOAuthPage[] {
    if (!data || typeof data !== 'object') return [];
    const rows = (data as { data?: unknown }).data;
    if (!Array.isArray(rows)) return [];
    return rows.reduce<FacebookOAuthPage[]>((pages, row) => {
        const item = row as Record<string, unknown>;
        const id = this.readString(item.id);
        const name = this.readString(item.name);
        const accessToken = this.readString(item.access_token);
        const tasks = Array.isArray(item.tasks)
          ? item.tasks.filter((task): task is string => typeof task === 'string')
          : undefined;
        if (!id || !name || !accessToken) return pages;
        pages.push({ id, name, accessToken, tasks });
        return pages;
      }, []);
  }

  private pruneOAuthSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.oauthSessions.entries()) {
      if (session.expiresAt <= now) this.oauthSessions.delete(sessionId);
    }
  }

  private readFacebookAppId(): string {
    const appId = this.readString(process.env.FACEBOOK_APP_ID);
    if (!appId) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_APP_ID_REQUIRED);
    }
    return appId;
  }

  private readFacebookAppSecret(): string {
    const appSecret = this.readString(process.env.FACEBOOK_APP_SECRET);
    if (!appSecret) {
      throw new BadRequestException(RESPONSE_MESSAGES.MESSAGING.FACEBOOK_APP_SECRET_REQUIRED);
    }
    return appSecret;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
