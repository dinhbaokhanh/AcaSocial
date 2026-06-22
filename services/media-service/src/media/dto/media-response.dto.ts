import { ApiProperty } from '@nestjs/swagger';
import { MediaCategory } from '../media.entity';

export class MediaResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-...' })
  id: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' })
  secureUrl: string;

  @ApiProperty({ example: 'jpg' })
  format: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ enum: MediaCategory, example: MediaCategory.IMAGE })
  category: MediaCategory;

  @ApiProperty({ example: 204800, description: 'Kích thước file tính bằng byte' })
  sizeBytes: number;

  @ApiProperty({ example: 'user-uuid-123', description: 'ID của người upload (từ X-User-ID header)' })
  uploadedBy: string;

  @ApiProperty({ example: '2024-01-15T08:30:00.000Z' })
  createdAt: Date;
}
