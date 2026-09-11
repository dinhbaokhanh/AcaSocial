import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class MediaReferenceService {
  constructor(private readonly config: ConfigService) {}
  async validate(ids: string[] | undefined, ownerId: string) {
    for (const id of ids ?? []) {
      let response: Response;
      try {
        response = await fetch(
          `${this.config.get('MEDIA_SERVICE_URL', 'http://localhost:8082')}/internal/media/${encodeURIComponent(id)}`,
          {
            headers: {
              'X-Internal-Token': this.config.get('INTERNAL_SERVICE_TOKEN', ''),
            },
            signal: AbortSignal.timeout(3000),
          },
        );
      } catch {
        throw new ServiceUnavailableException('Media service unavailable');
      }
      if (response.status === 404)
        throw new BadRequestException('Attachment not found');
      if (!response.ok)
        throw new ServiceUnavailableException('Cannot verify attachment');
      const asset = (await response.json()) as { uploadedBy?: string };
      if (asset.uploadedBy !== ownerId)
        throw new ForbiddenException('You can only attach your own files');
    }
  }
}
