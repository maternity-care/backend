import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessagingService } from '../messaging.service';
import { GeminiChatbotService } from '../../chatbot/gemini-chatbot.service';
import {
  MessagingAccountStatus,
  MessagingChannel,
  MessagingMessageType,
} from '../types/messaging.enums';

type ZcaApi = {
  listener?: {
    on: (event: string, cb: (...args: any[]) => unknown) => unknown;
    once?: (event: string, cb: (...args: any[]) => unknown) => unknown;
    start: (options?: { retryOnClose?: boolean }) => void;
    stop: () => void;
  };
  sendMessage: (message: string | { msg: string; attachments?: unknown }, threadId: string, type?: number) => Promise<unknown>;
  undo?: (
    payload: { msgId: string | number; cliMsgId: string | number },
    threadId: string,
    type?: number,
  ) => Promise<unknown>;
  getUserInfo?: (userId: string | string[], avatarSize?: number) => Promise<{
    changed_profiles?: Record<string, {
      avatar?: string;
      displayName?: string;
      zaloName?: string;
    }>;
  }>;
  findUser?: (phoneNumber: string, avatarSize?: number) => Promise<ZaloFoundUser>;
  getContext?: () => {
    imei?: string;
    cookie?: { toJSON?: () => { cookies?: unknown } };
    userAgent?: string;
    language?: string;
  };
};

export type ZaloFoundUser = {
  uid: string;
  zalo_name?: string;
  display_name?: string;
  avatar?: string;
  cover?: string;
  [key: string]: unknown;
};

type ZaloAttachmentInput = {
  url: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type RuntimeSession = {
  api: ZcaApi;
  accountId: string;
};

type ZaloRuntimeCredentials = {
  imei: string;
  cookie: unknown;
  userAgent: string;
  language?: string;
};

type ProxyAgentConstructor = new (proxy: string) => unknown;

const DEFAULT_ZALO_WEB_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

@Injectable()
export class ZaloPersonalRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(ZaloPersonalRuntimeService.name);
  private readonly sessions = new Map<string, RuntimeSession>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly geminiChatbotService: GeminiChatbotService,
  ) {}

  async onModuleInit(): Promise<void> {
    const accounts = await this.messagingService.listAccounts();
    await Promise.all(
      accounts
        .filter((account) => account.channel === MessagingChannel.ZALO_PERSONAL && account.autoStart)
        .map((account) => this.start(account.id).catch((error) => {
          this.logger.warn(`Cannot auto-start Zalo account ${account.id}: ${this.getErrorMessage(error)}`);
        })),
    );
  }

  async start(accountId: string): Promise<void> {
    if (this.sessions.has(accountId)) return;

    const account = await this.messagingService.getAccountForRuntime(accountId);
    if (account.channel !== MessagingChannel.ZALO_PERSONAL) return;
    if (!account.credentials) throw new Error('Account chưa có credentials để đăng nhập.');

    await this.messagingService.setAccountAutoStart(accountId, true);
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTING);

    try {
      const { Zalo } = await import('zca-js');
      const ProxyAgent = this.loadProxyAgent();
      const options: Record<string, unknown> = {
        selfListen: false,
        checkUpdate: true,
        logging: false,
        ...(account.proxyUrl ? { agent: new ProxyAgent(account.proxyUrl) } : {}),
      };
      const zalo = new Zalo(options as never);

      const api = await zalo.login(account.credentials as never) as ZcaApi;
      this.sessions.set(accountId, { api, accountId });
      this.bindListener(accountId, api);
      await this.startListener(accountId, api);
    } catch (error) {
      await this.messagingService.setAccountStatus(
        accountId,
        MessagingAccountStatus.ERROR,
        this.getErrorMessage(error),
      );
      throw error;
    }
  }

  async startQrLogin(input: {
    displayName?: string;
    proxyUrl?: string;
    autoStart?: boolean;
  }): Promise<{ accountId: string }> {
    const account = await this.messagingService.createZaloQrAccount(input);

    void this.runQrLogin(account.id).catch(async (error) => {
      this.emitQrError(account.id, error);
      await this.messagingService.setAccountStatus(
        account.id,
        MessagingAccountStatus.ERROR,
        this.getErrorMessage(error),
      );
    });

    return { accountId: account.id };
  }

  async startQrLoginForAccount(accountId: string): Promise<{ accountId: string }> {
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTING);

    void this.runQrLoginForExistingAccount(accountId).catch(async (error) => {
      this.emitQrError(accountId, error);
      await this.messagingService.setAccountStatus(
        accountId,
        MessagingAccountStatus.ERROR,
        this.getErrorMessage(error),
      );
    });

    return { accountId };
  }

  async stop(accountId: string, options?: { keepAutoStart?: boolean }): Promise<void> {
    const session = this.sessions.get(accountId);
    if (session) {
      session.api.listener?.stop();
      this.sessions.delete(accountId);
    }
    if (!options?.keepAutoStart) {
      await this.messagingService.setAccountAutoStart(accountId, false);
    }
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.DISCONNECTED);
  }

  async sendMessage(
    accountId: string,
    externalThreadId: string,
    externalThreadType: string,
    content: string,
    attachment?: ZaloAttachmentInput | null,
  ): Promise<unknown> {
    const session = this.sessions.get(accountId);
    if (!session) throw new Error('Zalo account chưa chạy. Hãy start account trước khi gửi.');
    const source = attachment ? await this.buildAttachmentSource(attachment) : null;
    const clientIds: string[] = [];
    const originalDateNow = Date.now;
    Date.now = () => {
      const value = originalDateNow();
      clientIds.push(String(value));
      return value;
    };
    try {
      const response = await session.api.sendMessage(
        source ? { msg: content, attachments: source } : { msg: content },
        externalThreadId,
        externalThreadType === 'group' ? 1 : 0,
      );
      return {
        ...(typeof response === 'object' && response !== null ? response as Record<string, unknown> : { response }),
        _clientIds: clientIds,
        _cliMsgId: clientIds[0] ?? null,
      };
    } finally {
      Date.now = originalDateNow;
    }
  }

  async undoMessage(
    accountId: string,
    externalThreadId: string,
    externalThreadType: string,
    payload: { msgId: string | number; cliMsgId: string | number },
  ): Promise<unknown> {
    const session = this.sessions.get(accountId);
    if (!session) throw new Error('Zalo account chưa chạy. Hãy start account trước khi thu hồi.');
    if (!session.api.undo) throw new Error('Phiên bản zca-js hiện tại chưa hỗ trợ thu hồi tin nhắn.');
    return session.api.undo(payload, externalThreadId, externalThreadType === 'group' ? 1 : 0);
  }

  async findUserByPhone(accountId: string, phone: string): Promise<ZaloFoundUser> {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) throw new BadRequestException('Nhập số điện thoại Zalo trước khi tạo hội thoại.');

    const session = this.sessions.get(accountId);
    if (!session) throw new BadRequestException('Zalo account chưa chạy. Hãy start account trước khi tìm SĐT.');
    if (!session.api.findUser) throw new BadRequestException('Phiên bản zca-js hiện tại chưa hỗ trợ tìm user theo SĐT.');

    const profile = await session.api.findUser(normalizedPhone, 120);
    if (!profile?.uid) throw new BadRequestException('Không tìm thấy tài khoản Zalo từ SĐT này.');
    return profile;
  }

  private async buildAttachmentSource(attachment: ZaloAttachmentInput): Promise<{
    data: Buffer;
    filename: `${string}.${string}`;
    metadata: { totalSize: number; width?: number; height?: number };
  }> {
    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error(`Không tải được file đính kèm (${response.status}).`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    const filename = this.normalizeAttachmentName(attachment.name, attachment.mimeType, attachment.url);
    const dimensions = attachment.mimeType?.startsWith('image/')
      ? this.readImageDimensions(data, attachment.mimeType)
      : null;
    return {
      data,
      filename,
      metadata: {
        totalSize: attachment.size && attachment.size > 0 ? attachment.size : data.length,
        width: dimensions?.width,
        height: dimensions?.height,
      },
    };
  }

  private normalizeAttachmentName(name?: string | null, mimeType?: string | null, url?: string): `${string}.${string}` {
    const rawName = this.readString(name) || this.readString(url?.split('/').pop()?.split('?')[0]) || 'attachment';
    const safeName = rawName.replace(/[^\w.\-() ]+/g, '_').replace(/\s+/g, '_');
    if (/\.[a-z0-9]{2,8}$/i.test(safeName)) return safeName as `${string}.${string}`;
    const extension = this.mimeExtension(mimeType) || 'bin';
    return `${safeName}.${extension}` as `${string}.${string}`;
  }

  private mimeExtension(mimeType?: string | null): string | null {
    const mime = this.readString(mimeType).toLowerCase();
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.includes('/')) return mime.split('/')[1]?.replace(/[^a-z0-9]/g, '') || null;
    return null;
  }

  private readImageDimensions(data: Buffer, mimeType?: string | null): { width: number; height: number } | null {
    const mime = this.readString(mimeType).toLowerCase();
    if (mime === 'image/png' && data.length >= 24 && data.toString('ascii', 1, 4) === 'PNG') {
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    }
    if ((mime === 'image/jpeg' || mime === 'image/jpg') && data.length > 4) {
      let offset = 2;
      while (offset < data.length) {
        if (data[offset] !== 0xff) break;
        const marker = data[offset + 1];
        const length = data.readUInt16BE(offset + 2);
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
        }
        offset += 2 + length;
      }
    }
    if (mime === 'image/webp' && data.length >= 30 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = data.toString('ascii', 12, 16);
      if (chunk === 'VP8X') {
        return {
          width: 1 + data.readUIntLE(24, 3),
          height: 1 + data.readUIntLE(27, 3),
        };
      }
    }
    return null;
  }

  private async runQrLogin(accountId: string): Promise<void> {
    const account = await this.messagingService.getAccountForRuntime(accountId);
    const { Zalo } = await import('zca-js');
    const ProxyAgent = this.loadProxyAgent();
    const options: Record<string, unknown> = {
      selfListen: false,
      checkUpdate: true,
      logging: false,
      ...(account.proxyUrl ? { agent: new ProxyAgent(account.proxyUrl) } : {}),
    };
    const zalo = new Zalo(options as never);
    const userAgent = this.readUserAgent(account.credentials) ?? DEFAULT_ZALO_WEB_USER_AGENT;
    let capturedCredentials: ZaloRuntimeCredentials | null = null;

    const api = await zalo.loginQR(
      { userAgent, language: 'vi' },
      (event: any) => {
        const eventType = this.normalizeQrEventType(event?.type);

        if (eventType === 0) {
          const image = this.normalizeQrImage(event.data?.image);
          this.messagingService.emitQrEvent({
            accountId,
            status: 'qr_generated',
            qrCode: event.data?.code,
            qrImage: image,
            token: event.data?.token,
            message: 'QR đã tạo, đang chờ quét bằng Zalo mobile.',
          });
        } else if (eventType === 1) {
          this.messagingService.emitQrEvent({
            accountId,
            status: 'qr_expired',
            message: 'QR đã hết hạn, bấm Xem QR để tạo lại.',
          });
        } else if (eventType === 2) {
          this.messagingService.emitQrEvent({
            accountId,
            status: 'qr_scanned',
            profile: event.data,
            message: 'Đã quét QR, đang hoàn tất đăng nhập. Nếu thiết bị đã tin cậy thì có thể không cần xác nhận thêm.',
          });
        } else if (eventType === 3) {
          this.messagingService.emitQrEvent({
            accountId,
            status: 'qr_declined',
            code: event.data?.code,
            message: 'Thiết bị đã từ chối đăng nhập.',
          });
        } else if (eventType === 4) {
          capturedCredentials = this.normalizeZaloRuntimeCredentials(event.data, userAgent);
          this.messagingService.emitQrEvent({
            accountId,
            status: 'qr_confirmed',
            message: 'Đã lấy được session Zalo, đang lưu account.',
          });
        }
      },
    ) as ZcaApi;

    capturedCredentials ??= this.credentialsFromApiContext(api, userAgent);

    if (capturedCredentials) {
      await this.messagingService.setAccountAutoStart(accountId, true);
      await this.messagingService.completeZaloQrLogin(accountId, capturedCredentials);
    } else {
      this.logger.warn(`Zalo QR login returned api without credentials for account ${accountId}`);
    }

    this.sessions.set(accountId, { api, accountId });
    this.bindListener(accountId, api);
    await this.startListener(accountId, api);
    this.messagingService.emitQrEvent({
      accountId,
      status: 'qr_authenticated',
      message: 'Đăng nhập Zalo thành công, account đã sẵn sàng nhận/gửi tin.',
    });
  }

  private async runQrLoginForExistingAccount(accountId: string): Promise<void> {
    const account = await this.messagingService.getAccountForRuntime(accountId);

    if (account.credentials) {
      try {
        await this.stop(accountId, { keepAutoStart: true });
        await this.start(accountId);
        this.messagingService.emitQrEvent({
          accountId,
          status: 'qr_authenticated',
          message: 'Session Zalo còn hiệu lực, đã kết nối lại mà không cần quét QR.',
        });
        return;
      } catch (error) {
        this.logger.warn(`Stored Zalo session cannot reconnect for account ${accountId}; falling back to QR: ${this.getErrorMessage(error)}`);
      }
    }

    await this.stop(accountId, { keepAutoStart: true });
    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTING);
    await this.runQrLogin(accountId);
  }

  private bindListener(accountId: string, api: ZcaApi): void {
    api.listener?.on('message', async (message: any) => {
      try {
        if (message?.isSelf) return;
        const data = message?.data ?? {};
        const content = typeof data.content === 'string' ? data.content : null;
        const attachment = this.readAttachment(data.content);
        const externalThreadId = String(message.threadId ?? data.uidFrom ?? data.idTo ?? '');
        if (!externalThreadId) {
          this.logger.warn(`Skip Zalo message without thread id for account ${accountId}`);
          return;
        }
        const senderId = data.uidFrom ? String(data.uidFrom) : null;
        const profile = await this.loadZaloProfile(api, senderId);
        const senderName = profile?.displayName || profile?.zaloName || (typeof data.dName === 'string' ? data.dName : null);

        const result = await this.messagingService.recordIncoming({
          accountId,
          externalThreadId,
          externalThreadType: Number(message.type) === 1 ? 'group' : 'user',
          externalMessageId: data.msgId ? String(data.msgId) : data.cliMsgId ? String(data.cliMsgId) : null,
          senderId,
          senderName,
          content: content ?? attachment?.title ?? null,
          messageType: content ? MessagingMessageType.TEXT : attachment?.messageType ?? MessagingMessageType.UNSUPPORTED,
          sentAt: data.ts ? new Date(Number(data.ts)) : new Date(),
          metadata: {
            zcaType: message.type,
            customerAvatarUrl: profile?.avatar,
            customerDisplayName: senderName,
            imageUrl: attachment?.imageUrl,
            thumbnailUrl: attachment?.thumbnailUrl,
            attachmentUrl: attachment?.attachmentUrl,
            attachmentTitle: attachment?.title,
            attachmentType: attachment?.type,
            raw: data,
          },
        });
        await this.maybeAutoReply(accountId, result.conversation.externalThreadId, result.conversation.externalThreadType, result.message);
      } catch (error) {
        this.logger.warn(`Cannot persist incoming Zalo message: ${this.getErrorMessage(error)}`);
      }
    });

    api.listener?.on('connected', () => {
      this.logger.log(`Zalo listener connected for account ${accountId}`);
      void this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTED);
    });
    api.listener?.on('disconnected', (_code: unknown, reason: unknown) => {
      void this.messagingService.setAccountStatus(
        accountId,
        MessagingAccountStatus.DISCONNECTED,
        this.isNormalClosure(_code, reason) ? null : typeof reason === 'string' ? reason : null,
      );
    });
    api.listener?.on('closed', (_code: unknown, reason: unknown) => {
      this.sessions.delete(accountId);
      void this.messagingService.setAccountStatus(
        accountId,
        MessagingAccountStatus.DISCONNECTED,
        this.isNormalClosure(_code, reason) ? null : typeof reason === 'string' ? reason : null,
      );
    });
    api.listener?.on('error', (error: unknown) => {
      this.logger.warn(`Zalo listener error for account ${accountId}: ${this.getErrorMessage(error)}`);
      void this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.ERROR, this.getErrorMessage(error));
    });
  }

  private async maybeAutoReply(
    accountId: string,
    externalThreadId: string,
    externalThreadType: string,
    message: { id: string; conversationId: string; content: string | null; messageType: MessagingMessageType; metadata: Record<string, unknown> | null },
  ): Promise<void> {
    if (externalThreadType !== 'user') return;
    if (!(await this.messagingService.shouldAutoReply(message.conversationId))) return;

    const history = await this.messagingService.buildAutoReplyHistory(message.conversationId);
    const imageUrl = this.readString(message.metadata?.imageUrl);
    const userMessage = this.readString(message.content) ||
      this.readString(message.metadata?.attachmentTitle) ||
      (message.messageType === MessagingMessageType.IMAGE ? 'Khách vừa gửi hình ảnh.' : 'Khách vừa gửi tin nhắn mới.');
    const files = imageUrl ? [{ url: imageUrl, mimeType: 'image/jpeg' }] : [];
    const reply = await this.geminiChatbotService.generateReplyWithFiles(userMessage, history, files) ||
      'Mình đã nhận được tin nhắn của bạn. Tư vấn viên/bác sĩ sẽ phản hồi sớm nhé.';
    const outbound = await this.messagingService.recordAutoReplyOutbound({
      conversationId: message.conversationId,
      content: reply,
      reason: 'zalo_inbound_after_60m_or_no_reply',
    });

    try {
      const providerResponse = await this.sendMessage(accountId, externalThreadId, externalThreadType, reply);
      await this.messagingService.updateOutboundDelivery(outbound.message.id, 'sent', null, providerResponse);
    } catch (error) {
      await this.messagingService.updateOutboundDelivery(
        outbound.message.id,
        'failed',
        this.getErrorMessage(error),
      );
      this.logger.warn(`Cannot send Zalo AI auto-reply: ${this.getErrorMessage(error)}`);
    }
  }

  private readAttachment(content: unknown): {
    messageType: MessagingMessageType;
    imageUrl?: string;
    thumbnailUrl?: string;
    attachmentUrl?: string;
    title?: string;
    type?: string;
  } | null {
    if (!content || typeof content !== 'object') return null;
    const payload = content as Record<string, unknown>;
    const type = this.readString(payload.type).toLowerCase();
    const href = this.readString(payload.href) || this.readString(payload.url) || this.readString(payload.oriUrl) || this.readString(payload.normalUrl);
    const thumb = this.readString(payload.thumb) || this.readString(payload.thumbUrl) || this.readString(payload.thumbnail) || this.readString(payload.preview);
    const title = this.readString(payload.title) || this.readString(payload.description) || null;
    const msgType = this.readString((payload as { msgType?: unknown }).msgType).toLowerCase();
    const isImage = type.includes('image') || type.includes('photo') || msgType.includes('photo') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(href || thumb);
    const isSticker = type.includes('sticker') || msgType.includes('sticker');

    if (isImage || thumb || href) {
      return {
        messageType: isSticker ? MessagingMessageType.STICKER : isImage ? MessagingMessageType.IMAGE : MessagingMessageType.FILE,
        imageUrl: isImage ? href || thumb : undefined,
        thumbnailUrl: thumb || href || undefined,
        attachmentUrl: href || thumb || undefined,
        title: title || (isImage ? 'Hình ảnh' : 'Tệp đính kèm'),
        type: type || msgType || undefined,
      };
    }

    return null;
  }

  private async startListener(accountId: string, api: ZcaApi): Promise<void> {
    if (!api.listener) {
      await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTED);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback();
      };
      const timer = setTimeout(() => {
        this.logger.warn(`Zalo listener did not emit connected quickly for account ${accountId}; keeping session running.`);
        settle(resolve);
      }, 10000);

      api.listener?.once?.('connected', () => settle(resolve));
      api.listener?.once?.('error', (error: unknown) => settle(() => reject(error)));
      api.listener?.once?.('closed', (_code: unknown, reason: unknown) => {
        settle(() => reject(new Error(typeof reason === 'string' && reason ? reason : 'Zalo listener closed.')));
      });
      api.listener?.start({ retryOnClose: true });
    });

    await this.messagingService.setAccountStatus(accountId, MessagingAccountStatus.CONNECTED);
  }

  private loadProxyAgent(): ProxyAgentConstructor {
    // proxy-agent publishes modern exports that this project TS config cannot type-resolve.
    // Runtime require works in the current CommonJS Nest build.
    return require('proxy-agent').ProxyAgent as ProxyAgentConstructor;
  }

  private normalizeQrImage(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const image = value.trim();
    if (image.startsWith('data:image/')) return image;
    return `data:image/png;base64,${image}`;
  }

  private readUserAgent(credentials: unknown): string | null {
    if (!credentials || typeof credentials !== 'object') return null;
    const userAgent = (credentials as { userAgent?: unknown }).userAgent;
    return typeof userAgent === 'string' && userAgent.trim() ? userAgent.trim() : null;
  }

  private async loadZaloProfile(
    api: ZcaApi,
    userId: string | null,
  ): Promise<{ avatar?: string; displayName?: string; zaloName?: string } | null> {
    if (!userId || !api.getUserInfo) return null;
    try {
      const response = await api.getUserInfo(userId, 120);
      return response.changed_profiles?.[userId] ?? null;
    } catch (error) {
      this.logger.warn(`Cannot load Zalo profile ${userId}: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  private emitQrError(accountId: string, error: unknown): void {
    this.messagingService.emitQrEvent({
      accountId,
      status: 'qr_error',
      error: this.getErrorMessage(error),
      message: 'QR login lỗi, bấm Xem QR để thử lại.',
    });
  }

  private isNormalClosure(code: unknown, reason: unknown): boolean {
    return code === 1000 || reason === 'NORMAL_CLOSURE';
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeQrEventType(type: unknown): number | null {
    if (typeof type === 'number') return type;
    if (typeof type !== 'string') return null;

    const normalized = type.trim().toLowerCase();
    const aliases: Record<string, number> = {
      qrcodegenerated: 0,
      qr_code_generated: 0,
      qrgenerated: 0,
      generated: 0,
      qrcodeexpired: 1,
      qr_code_expired: 1,
      qrexpired: 1,
      expired: 1,
      qrcodescanned: 2,
      qr_code_scanned: 2,
      qrscanned: 2,
      scanned: 2,
      qrcodedeclined: 3,
      qr_code_declined: 3,
      qrdeclined: 3,
      declined: 3,
      gotlogininfo: 4,
      got_login_info: 4,
      logininfo: 4,
      authenticated: 4,
    };

    return aliases[normalized] ?? null;
  }

  private normalizeZaloRuntimeCredentials(
    data: unknown,
    fallbackUserAgent: string,
  ): ZaloRuntimeCredentials | null {
    if (!data || typeof data !== 'object') return null;
    const source = data as { imei?: unknown; cookie?: unknown; userAgent?: unknown; language?: unknown };
    const imei = this.readString(source.imei);
    const userAgent = this.readString(source.userAgent) || fallbackUserAgent;

    if (!imei || !source.cookie || !userAgent) return null;

    return {
      imei,
      cookie: source.cookie,
      userAgent,
      language: this.readString(source.language) || 'vi',
    };
  }

  private credentialsFromApiContext(api: ZcaApi, fallbackUserAgent: string): ZaloRuntimeCredentials | null {
    try {
      const context = api.getContext?.();
      const imei = this.readString(context?.imei);
      const cookie = context?.cookie?.toJSON?.().cookies;
      const userAgent = this.readString(context?.userAgent) || fallbackUserAgent;

      if (!imei || !cookie || !userAgent) return null;

      return {
        imei,
        cookie,
        userAgent,
        language: this.readString(context?.language) || 'vi',
      };
    } catch (error) {
      this.logger.warn(`Cannot read Zalo credentials from api context: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  private normalizePhone(value: string): string {
    const raw = this.readString(value).replace(/[^\d+]/g, '');
    if (!raw) return '';
    if (raw.startsWith('+84')) return `0${raw.slice(3)}`;
    if (raw.startsWith('84') && raw.length >= 10) return `0${raw.slice(2)}`;
    return raw;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
