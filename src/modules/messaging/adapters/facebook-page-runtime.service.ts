import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MessagingService } from '../messaging.service';
import {
  MessagingAccountStatus,
  MessagingChannel,
  MessagingMessageType,
} from '../types/messaging.enums';

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

@Injectable()
export class FacebookPageRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(FacebookPageRuntimeService.name);
  private readonly oauthSessions = new Map<string, FacebookOAuthSession>();

  constructor(private readonly messagingService: MessagingService) {}

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
    this.readCredentials(account.credentials);
    await this.messagingService.setAccountAutoStart(accountId, true);
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTED);
  }

  createOAuthUrl(redirectUri: string): { url: string; state: string } {
    const appId = this.readFacebookAppId();
    const cleanRedirectUri = this.readString(redirectUri);
    if (!cleanRedirectUri) throw new BadRequestException('Thiếu redirectUri cho Facebook OAuth.');
    const state = randomUUID();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: cleanRedirectUri,
      state,
      response_type: 'code',
      scope: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_messaging',
      ].join(','),
    });
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
      throw new BadRequestException('Thiếu code/state/redirectUri từ Facebook OAuth.');
    }

    const tokenResponse = await this.graphGet('/oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const userToken = this.readString((tokenResponse as Record<string, unknown>)?.access_token);
    if (!userToken) throw new BadRequestException('Không lấy được user access token từ Facebook.');

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
      throw new BadRequestException('Facebook account này chưa trả về Page nào có access token.');
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
    if (!session) throw new BadRequestException('Phiên connect Facebook đã hết hạn, vui lòng connect lại.');
    const page = session.pages.find((item) => item.id === pageId);
    if (!page) throw new BadRequestException('Không tìm thấy Page trong phiên connect Facebook.');

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
  ): Promise<unknown> {
    const account = await this.messagingService.getAccountForRuntime(accountId);
    const credentials = this.readCredentials(account.credentials);
    const responses: unknown[] = [];
    const cleanContent = content.trim();

    if (cleanContent) {
      responses.push(await this.sendGraphMessage(credentials, recipientId, {
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text: cleanContent },
      }));
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
      throw new BadRequestException('Nhập nội dung hoặc đính kèm trước khi gửi Facebook.');
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

      const credentials = this.readCredentials(account.credentials);
      const events = Array.isArray(entryObject.messaging) ? entryObject.messaging : [];
      for (const event of events) {
        await this.handleMessagingEvent(account.id, credentials, event);
      }
    }
  }

  async verifyWebhook(mode?: string, token?: string, challenge?: string): Promise<string> {
    if (mode !== 'subscribe' || !token || !challenge) {
      throw new BadRequestException('Facebook webhook verify payload không hợp lệ.');
    }

    const configuredToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    if (configuredToken && configuredToken === token) return challenge;
    if (await this.messagingService.hasFacebookVerifyToken(token)) return challenge;

    throw new BadRequestException('Facebook webhook verify token không khớp.');
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
    const text = this.readString(event.message?.text);
    const messageType = attachmentUrl
      ? (attachmentType === 'image' ? MessagingMessageType.IMAGE : MessagingMessageType.FILE)
      : MessagingMessageType.TEXT;

    await this.messagingService.recordIncoming({
      accountId,
      externalThreadId: senderId,
      externalThreadType: 'user',
      externalMessageId: this.readString(event.message?.mid) || null,
      senderId,
      senderName: profile.name || senderId,
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
        rawEvent: event,
      },
    });
  }

  private async sendGraphMessage(
    credentials: FacebookPageCredentials,
    recipientId: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetch(`${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(credentials.pageAccessToken)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = this.extractGraphError(data) || `Facebook Graph API lỗi (${response.status}).`;
      throw new Error(message);
    }
    return data ?? { recipientId };
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
        fields: 'first_name,last_name,name,profile_pic',
        access_token: credentials.pageAccessToken,
      });
      const response = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(userId)}?${params.toString()}`);
      const data = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!response.ok || !data) return { name: null, avatarUrl: null, raw: data };
      const name = this.readString(data.name) ||
        [this.readString(data.first_name), this.readString(data.last_name)].filter(Boolean).join(' ') ||
        null;
      return {
        name,
        avatarUrl: this.readString(data.profile_pic) || null,
        raw: data,
      };
    } catch (error) {
      this.logger.warn(`Cannot fetch Facebook user profile ${userId}: ${this.getErrorMessage(error)}`);
      return { name: null, avatarUrl: null, raw: null };
    }
  }

  private readCredentials(credentials: Record<string, unknown> | null): FacebookPageCredentials {
    const pageId = this.readString(credentials?.pageId);
    const pageName = this.readString(credentials?.pageName);
    const pageAccessToken = this.readString(credentials?.pageAccessToken);
    if (!pageId || !pageName || !pageAccessToken) {
      throw new BadRequestException('Facebook Page cần pageId, pageName và pageAccessToken.');
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
    if (!appId) throw new BadRequestException('Thiếu FACEBOOK_APP_ID trong backend env.');
    return appId;
  }

  private readFacebookAppSecret(): string {
    const appSecret = this.readString(process.env.FACEBOOK_APP_SECRET);
    if (!appSecret) throw new BadRequestException('Thiếu FACEBOOK_APP_SECRET trong backend env.');
    return appSecret;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
