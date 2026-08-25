import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, createPartFromBase64 } from '@google/genai';
import { DataSource } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ChatbotMessage } from './chatbot.types';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';

export type GeminiReplyChannel = 'web_chat' | 'facebook_page' | 'zalo_personal';

export type GeminiReplyOptions = {
  channel?: GeminiReplyChannel;
  supportsButtons?: boolean;
  supportsLinks?: boolean;
  systemContext?: string | null;
};

@Injectable()
export class GeminiChatbotService {
  private readonly logger = new Logger(GeminiChatbotService.name);
  private readonly knowledge: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.knowledge = this.loadKnowledge();
  }

  async generateReply(
    userMessage: string,
    history: ChatbotMessage[],
    options: GeminiReplyOptions = {},
  ): Promise<string | null> {
    return this.generateReplyWithFiles(userMessage, history, [], options);
  }

  async generateReplyWithFiles(
    userMessage: string,
    history: ChatbotMessage[],
    files: Array<{ url: string; mimeType: string }> = [],
    options: GeminiReplyOptions = {},
  ): Promise<string | null> {
    const deterministicReply = await this.buildDeterministicSystemReply(userMessage, options);
    if (deterministicReply) {
      return this.normalizeReplyForChannel(deterministicReply, options);
    }

    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = this.configService.get<string>('gemini.model') || DEFAULT_GEMINI_MODEL;
      const fileParts = await this.buildInlineFileParts(files);
      if (files.length > 0 && fileParts.length === 0) {
        return null;
      }
      const response = await ai.models.generateContent({
        model,
        contents: [
          this.buildPrompt(userMessage, history, files.length > 0, options),
          ...fileParts,
        ],
      });

      return this.normalizeReplyForChannel(response.text?.trim() || null, options);
    } catch (error) {
      this.logger.warn(
        `Gemini reply failed, falling back to local bot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async buildInlineFileParts(files: Array<{ url: string; mimeType: string }>) {
    const parts: ReturnType<typeof createPartFromBase64>[] = [];

    const seenUrls = new Set<string>();
    for (const file of files) {
      if (!file.mimeType.toLowerCase().startsWith('image/')) continue;
      if (seenUrls.has(file.url)) continue;
      seenUrls.add(file.url);

      try {
        const response = await fetch(file.url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`image fetch failed: ${response.status} ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        parts.push(createPartFromBase64(buffer.toString('base64'), file.mimeType));
        break;
      } catch (error) {
        this.logger.warn(
          `Gemini image inline conversion failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return parts;
  }

  private async buildDeterministicSystemReply(
    userMessage: string,
    options: GeminiReplyOptions,
  ): Promise<string | null> {
    const contextReply = this.buildReplyFromSystemContext(options.systemContext);
    if (contextReply) return contextReply;

    const normalized = this.normalizeSearchText(userMessage);
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
    const wantsDoctor = this.includesAny(normalized, [
      'bac si',
      'bsi',
      'bs ',
      'doctor',
      'chuyen khoa',
      'nhan vien y te',
    ]);
    const wantsAppointment = this.includesAny(normalized, [
      'lich',
      'hen',
      'ca kham',
      'dat lich',
    ]);

    if (!wantsFacility && !wantsDoctor && !wantsAppointment) return null;

    const sections: string[] = [];

    if (wantsFacility) {
      const facilities = await this.loadPublicFacilityContext();
      sections.push(
        facilities.length > 0
          ? [
            'Các cơ sở hiện có trong hệ thống:',
            facilities.map((facility, index) => {
              const address = [facility.address, facility.ward, facility.province].filter(Boolean).join(', ');
              return `${index + 1}. ${facility.name} (${facility.code}) - Địa chỉ: ${address || 'chưa có'}; SĐT/Hotline: ${facility.phone || 'chưa có'}; Email: ${facility.email || 'chưa có'}.`;
            }).join('\n'),
          ].join('\n')
          : 'Hiện trong DB chưa có cơ sở/phòng khám phù hợp.',
      );
    }

    if (wantsDoctor) {
      const doctors = await this.loadPublicDoctorContext();
      sections.push(
        doctors.length > 0
          ? [
            'Bác sĩ hiện có trong hệ thống:',
            doctors.map((doctor, index) => {
              const fullName = [doctor.title, doctor.name].filter(Boolean).join(' ');
              const contact = [
                doctor.phone ? `SĐT: ${doctor.phone}` : null,
                doctor.email ? `Email: ${doctor.email}` : null,
              ].filter(Boolean).join('; ');
              return `${index + 1}. ${fullName || doctor.name || `Bác sĩ #${doctor.id}`} - Chuyên khoa: ${doctor.specialty || 'chưa cập nhật'}; Cơ sở: ${doctor.facilityName || 'chưa có'}; ${contact || 'Liên hệ: chưa có'}.`;
            }).join('\n'),
          ].join('\n')
          : 'Hiện trong DB chưa tìm thấy bác sĩ phù hợp.',
      );
    }

    if (wantsAppointment) {
      sections.push(
        options.channel === 'web_chat'
          ? 'Bạn cần đăng nhập để mình tra lịch hẹn theo tài khoản trong hệ thống.'
          : 'Mình cần xác thực tài khoản trước khi tra lịch hẹn. Bạn vui lòng đăng nhập trên website hoặc nhắn gặp tư vấn viên/bác sĩ để được hỗ trợ.',
      );
    }

    return sections.join('\n\n').slice(0, 5000);
  }

  private buildReplyFromSystemContext(systemContext?: string | null): string | null {
    if (!systemContext) return null;

    const sections = systemContext
      .split('\n\n')
      .map((section) => section.trim())
      .filter(Boolean);
    const replies: string[] = [];

    for (const section of sections) {
      const [heading, ...bodyLines] = section.split('\n');
      const body = bodyLines.join('\n').trim();
      if (!body || heading.startsWith('Quy tắc')) continue;

      if (heading.startsWith('Cơ sở/phòng khám')) {
        replies.push(
          body.startsWith('Chưa')
            ? 'Hiện trong DB chưa có cơ sở/phòng khám phù hợp.'
            : ['Các cơ sở hiện có trong hệ thống:', body].join('\n'),
        );
      } else if (heading.startsWith('Bác sĩ')) {
        replies.push(
          body.startsWith('Chưa')
            ? 'Hiện trong DB chưa tìm thấy bác sĩ phù hợp.'
            : ['Bác sĩ hiện có trong hệ thống:', body].join('\n'),
        );
      } else if (heading.startsWith('Lịch hẹn')) {
        replies.push(
          body.startsWith('Chưa') || body.startsWith('Không thể')
            ? body
            : ['Lịch hẹn tìm thấy trong hệ thống:', body].join('\n'),
        );
      }
    }

    return replies.length > 0 ? replies.join('\n\n').slice(0, 5000) : null;
  }

  private async loadPublicFacilityContext(): Promise<Array<{
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    province: string | null;
    ward: string | null;
  }>> {
    return this.dataSource.query(`
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
      ORDER BY facility.name ASC
      LIMIT 20
    `);
  }

  private async loadPublicDoctorContext(): Promise<Array<{
    id: string;
    name: string;
    title: string | null;
    specialty: string | null;
    facilityName: string | null;
    phone: string | null;
    email: string | null;
  }>> {
    return this.dataSource.query(`
      SELECT
        CAST(staff.id AS CHAR) AS id,
        staff.full_name AS name,
        doctor.title AS title,
        doctor.specialty AS specialty,
        facility.name AS facilityName,
        staff.phone AS phone,
        staff.email AS email
      FROM doctors doctor
      INNER JOIN staffs staff ON staff.id = doctor.staff_id AND staff.deleted_at IS NULL
      LEFT JOIN facilities facility ON facility.id = staff.facility_id AND facility.deleted_at IS NULL
      WHERE LOWER(COALESCE(doctor.status, 'active')) = 'active'
        AND LOWER(COALESCE(staff.status, 'active')) = 'active'
      ORDER BY staff.full_name ASC
      LIMIT 30
    `);
  }

  private normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();
  }

  private includesAny(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
  }

  private getApiKey(): string | undefined {
    return this.configService.get<string>('gemini.apiKey') || process.env.GEMINI_API_KEY;
  }

  private buildPrompt(
    userMessage: string,
    history: ChatbotMessage[],
    hasFiles = false,
    options: GeminiReplyOptions = {},
  ): string {
    const recentHistory = history
      .slice(-8)
      .map((message) => `${message.sender}: ${message.content}`)
      .join('\n');

    const channel = options.channel ?? 'web_chat';
    const supportsButtons = options.supportsButtons ?? channel !== 'zalo_personal';
    const supportsLinks = options.supportsLinks ?? channel === 'web_chat';

    return [
      this.knowledge,
      '## Lịch sử chat gần đây',
      recentHistory || '(Chưa có lịch sử)',
      options.systemContext
        ? ['## Dữ liệu hệ thống có thể dùng để trả lời', options.systemContext].join('\n')
        : '',
      '## Câu hỏi hiện tại của user',
      userMessage || (hasFiles ? 'User vừa gửi ảnh/file và muốn được hỗ trợ.' : ''),
      '## Kênh trả lời',
      this.buildChannelInstruction(channel, supportsButtons, supportsLinks),
      '## Yêu cầu output',
      '- Chỉ trả lời nội dung cho user, không thêm markdown phức tạp.',
      supportsLinks
        ? '- Được dùng markdown link nội bộ dạng [Tên mục](/duong-dan) khi hướng dẫn user truy cập màn hình trong hệ thống.'
        : '- Không dùng markdown link. Nếu cần dẫn đường, nói tên mục bằng chữ thường, ví dụ: mục Lịch khám hoặc Hồ sơ thai kỳ.',
      supportsLinks
        ? '- Link nhanh: [Lịch khám](/schedule), [Hồ sơ thai kỳ](/record-keeping), [Upload hồ sơ](/uploads), [Thông tin cá nhân](/profile), [Dịch vụ](/#services), [Gói thai sản](/#packages).'
        : '- Không đưa URL nội bộ như /schedule, /record-keeping, /#services, /#packages vào câu trả lời.',
      '- Tối đa 5 câu, ưu tiên rõ ràng và hành động tiếp theo.',
      supportsButtons
        ? '- Với câu hỏi cần bác sĩ nhưng không phải cấp cứu, có thể nhắc khách chọn nút "Gặp tư vấn viên/bác sĩ" nếu kênh đang có nút đó.'
        : '- Với câu hỏi cần bác sĩ nhưng không phải cấp cứu, không nhắc bấm nút. Hãy nói khách trả lời "gặp tư vấn viên" để được chuyển cho tư vấn viên/bác sĩ.',
      '- Chỉ khuyên gọi cấp cứu/đến cơ sở y tế ngay khi có dấu hiệu khẩn cấp.',
      '- Không dùng cụm "người thật" trong câu trả lời; hãy dùng "bác sĩ" hoặc "tư vấn viên/bác sĩ".',
      '- Khi user hỏi lịch hẹn, bác sĩ, cơ sở/phòng khám hoặc thông tin nội bộ của Maternity Care System, chỉ dùng dữ liệu ở mục "Dữ liệu hệ thống có thể dùng để trả lời"; nếu mục đó không có hoặc không khớp thì nói chưa tìm thấy trong hệ thống.',
      '- Nếu mục "Dữ liệu hệ thống có thể dùng để trả lời" có danh sách cơ sở, bác sĩ hoặc lịch hẹn, bắt buộc trả lời bằng danh sách đó; không được nói "chưa cập nhật", "chưa có dữ liệu" hoặc hướng dẫn kiểm tra mục khác.',
      '- Tuyệt đối không tự bịa tên cơ sở, địa chỉ, số điện thoại, email, hotline, bác sĩ, lịch hẹn hoặc dữ liệu vận hành ngoài dữ liệu hệ thống được cung cấp.',
      hasFiles
        ? supportsButtons
          ? '- Nếu có ảnh/file y tế như siêu âm, xét nghiệm, toa thuốc, triệu chứng cơ thể: chỉ mô tả quan sát chung/giải thích khả năng đọc được ở mức tham khảo, không chẩn đoán; có thể khuyên chọn nút "Gặp tư vấn viên/bác sĩ" để bác sĩ xem.'
          : '- Nếu có ảnh/file y tế như siêu âm, xét nghiệm, toa thuốc, triệu chứng cơ thể: chỉ mô tả quan sát chung/giải thích khả năng đọc được ở mức tham khảo, không chẩn đoán; khuyên khách trả lời "gặp tư vấn viên" để bác sĩ xem.'
        : '',
    ].join('\n\n');
  }

  private buildChannelInstruction(
    channel: GeminiReplyChannel,
    supportsButtons: boolean,
    supportsLinks: boolean,
  ): string {
    if (channel === 'zalo_personal') {
      return [
        '- Kênh: Zalo cá nhân.',
        '- Zalo cá nhân hiện chỉ gửi text/file cơ bản, không có button/quick reply trong hệ thống này.',
        '- Không viết "bấm nút", "click nút", "chọn button", hoặc markdown link.',
        '- Câu trả lời cần tự nhiên như nhân viên đang nhắn Zalo.',
      ].join('\n');
    }

    if (channel === 'facebook_page') {
      return [
        '- Kênh: Facebook Page Messenger.',
        supportsButtons
          ? '- Có thể gợi ý thao tác dạng quick reply. Hệ thống sẽ tự đính nút phù hợp nếu cần.'
          : '- Không giả định có button.',
        supportsLinks ? '- Có thể dùng link nếu thật sự cần.' : '- Tránh link nội bộ website trong Messenger.',
        '- Câu trả lời cần ngắn, thân thiện, hợp ngữ cảnh inbox page.',
      ].join('\n');
    }

    return [
      '- Kênh: chatbot web trong website.',
      '- Có nút "Gặp tư vấn viên/bác sĩ" và có thể dùng link nội bộ.',
      '- Câu trả lời có thể hướng dẫn người dùng bấm nút hoặc mở các mục trong website.',
    ].join('\n');
  }

  private normalizeReplyForChannel(
    reply: string | null,
    options: GeminiReplyOptions,
  ): string | null {
    if (!reply) return null;
    if (options.channel !== 'zalo_personal') return reply;

    return reply
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[`*_~]/g, '')
      .replace(/bấm nút\s*["“”]?Gặp tư vấn viên\/bác sĩ["“”]?/gi, 'nhắn "gặp tư vấn viên"')
      .replace(/chọn nút\s*["“”]?Gặp tư vấn viên\/bác sĩ["“”]?/gi, 'nhắn "gặp tư vấn viên"')
      .replace(/click nút\s*["“”]?Gặp tư vấn viên\/bác sĩ["“”]?/gi, 'nhắn "gặp tư vấn viên"')
      .replace(/\/(?:schedule|record-keeping|uploads|profile|#services|#packages)\b/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private loadKnowledge(): string {
    const candidates = [
      join(process.cwd(), 'src/modules/chatbot/maternity-care-knowledge.md'),
      join(__dirname, 'maternity-care-knowledge.md'),
      join(__dirname, '../../../src/modules/chatbot/maternity-care-knowledge.md'),
    ];

    const path = candidates.find((candidate) => existsSync(candidate));
    if (!path) {
      this.logger.warn('maternity-care-knowledge.md not found; Gemini will use minimal prompt.');
      return 'Bạn là trợ lý AI cho Maternity Care System. Trả lời tiếng Việt, an toàn, không chẩn đoán y khoa.';
    }

    return readFileSync(path, 'utf8');
  }
}
