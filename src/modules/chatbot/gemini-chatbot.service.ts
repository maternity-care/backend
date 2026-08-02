import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, createPartFromBase64 } from '@google/genai';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ChatbotMessage } from './chatbot.types';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';

@Injectable()
export class GeminiChatbotService {
  private readonly logger = new Logger(GeminiChatbotService.name);
  private readonly knowledge: string;

  constructor(private readonly configService: ConfigService) {
    this.knowledge = this.loadKnowledge();
  }

  async generateReply(userMessage: string, history: ChatbotMessage[]): Promise<string | null> {
    return this.generateReplyWithFiles(userMessage, history);
  }

  async generateReplyWithFiles(
    userMessage: string,
    history: ChatbotMessage[],
    files: Array<{ url: string; mimeType: string }> = [],
  ): Promise<string | null> {
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
          this.buildPrompt(userMessage, history, files.length > 0),
          ...fileParts,
        ],
      });

      return response.text?.trim() || null;
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

  private getApiKey(): string | undefined {
    return this.configService.get<string>('gemini.apiKey') || process.env.GEMINI_API_KEY;
  }

  private buildPrompt(userMessage: string, history: ChatbotMessage[], hasFiles = false): string {
    const recentHistory = history
      .slice(-8)
      .map((message) => `${message.sender}: ${message.content}`)
      .join('\n');

    return [
      this.knowledge,
      '## Lịch sử chat gần đây',
      recentHistory || '(Chưa có lịch sử)',
      '## Câu hỏi hiện tại của user',
      userMessage || (hasFiles ? 'User vừa gửi ảnh/file và muốn được hỗ trợ.' : ''),
      '## Yêu cầu output',
      '- Chỉ trả lời nội dung cho user, không thêm markdown phức tạp.',
      '- Được dùng markdown link nội bộ dạng [Tên mục](/duong-dan) khi hướng dẫn user truy cập màn hình trong hệ thống.',
      '- Link nhanh: [Lịch khám](/schedule), [Hồ sơ thai kỳ](/record-keeping), [Upload hồ sơ](/uploads), [Thông tin cá nhân](/profile), [Dịch vụ](/#services), [Gói thai sản](/#packages).',
      '- Tối đa 5 câu, ưu tiên rõ ràng và hành động tiếp theo.',
      '- Với câu hỏi cần bác sĩ nhưng không phải cấp cứu, hành động tiếp theo phải là: bấm nút "Gặp tư vấn viên/bác sĩ" trong khung chat này.',
      '- Chỉ khuyên gọi cấp cứu/đến cơ sở y tế ngay khi có dấu hiệu khẩn cấp.',
      '- Không dùng cụm "người thật" trong câu trả lời; hãy dùng "bác sĩ" hoặc "tư vấn viên/bác sĩ".',
      hasFiles
        ? '- Nếu có ảnh/file y tế như siêu âm, xét nghiệm, toa thuốc, triệu chứng cơ thể: chỉ mô tả quan sát chung/giải thích khả năng đọc được ở mức tham khảo, không chẩn đoán; khuyên bấm nút "Gặp tư vấn viên/bác sĩ" để bác sĩ xem.'
        : '',
    ].join('\n\n');
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
