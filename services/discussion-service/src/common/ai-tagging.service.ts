import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiTagSuggestion {
  slug: string;
  score: number;
  source: string;
}

/** ok: có gợi ý; low_confidence: nội dung chưa đủ rõ (vd. gõ linh tinh); off_topic: không thuộc môn chuyên ngành. */
export type AiTagStatus = 'ok' | 'low_confidence' | 'off_topic';

@Injectable()
export class AiTaggingService {
  private readonly logger = new Logger(AiTaggingService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Gợi ý tag chỉ là tiện ích khi soạn bài: ai-service lỗi hoặc chậm thì trả về
   * null để người dùng tự chọn tag, không chặn luồng đăng bài.
   */
  async suggest(
    title: string,
    content: string,
  ): Promise<{
    model: string;
    status: AiTagStatus;
    tags: AiTagSuggestion[];
    related: AiTagSuggestion[];
  } | null> {
    try {
      const response = await fetch(
        `${this.config.getOrThrow<string>('AI_SERVICE_URL')}/internal/ai/tag`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN'),
          },
          body: JSON.stringify({ title, content }),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) {
        this.logger.warn(`AI service responded ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      this.logger.warn(`AI service unavailable: ${(error as Error).message}`);
      return null;
    }
  }
}
