import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AcademicContext {
  majorCourseId: string;
  majorId: string;
  courseId: string;
  allowedTopics: Array<{ topicId: string; relevanceWeight: number }>;
}

@Injectable()
export class AcademicReferenceService {
  constructor(private readonly config: ConfigService) {}

  async context(majorCourseId: string): Promise<AcademicContext> {
    const response = await this.get(
      `/internal/academic/contexts/${encodeURIComponent(majorCourseId)}`,
    );
    if (response.status === 404)
      throw new BadRequestException('Academic context does not exist');
    if (!response.ok)
      throw new ServiceUnavailableException('Cannot validate academic context');
    return response.json();
  }

  async major(majorId: string): Promise<{ id: string; code: string; name: string }> {
    const response = await this.get(`/internal/academic/majors/${encodeURIComponent(majorId)}`);
    if (response.status === 404) throw new BadRequestException('Active major does not exist');
    if (!response.ok) throw new ServiceUnavailableException('Cannot validate major');
    return response.json();
  }

  private async get(path: string) {
    try {
      return await fetch(
        `${this.config.getOrThrow<string>('ACADEMIC_SERVICE_URL')}${path}`,
        {
          headers: {
            'X-Internal-Token': this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN'),
          },
          signal: AbortSignal.timeout(3000),
        },
      );
    } catch {
      throw new ServiceUnavailableException('Academic service unavailable');
    }
  }
}
