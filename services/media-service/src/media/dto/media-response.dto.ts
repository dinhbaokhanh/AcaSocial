import { MediaCategory } from '../media.entity';

export class MediaResponseDto {
  id: string;
  secureUrl: string;
  format: string;
  mimeType: string;
  category: MediaCategory;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: Date;
}
