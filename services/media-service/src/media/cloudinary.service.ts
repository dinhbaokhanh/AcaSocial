import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { MediaCategory } from './media.entity';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // Upload buffer lên Cloudinary qua stream (không ghi disk)
  async upload(buffer: Buffer, category: MediaCategory): Promise<UploadApiResponse> {
    const folder = `acasocial/${category}s`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(new InternalServerErrorException(
              `Cloudinary upload thất bại: ${error.message}`,
            ));
            return;
          }
          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  // resource_type phải khớp với loại Cloudinary đã gán lúc upload, nếu không destroy
  // trả "not found" mà không báo lỗi và file vẫn nằm trên CDN.
  // Bản ghi cũ chưa lưu resource_type thì suy ra từ category.
  async destroy(
    publicId: string,
    category: MediaCategory,
    resourceType?: string | null,
  ): Promise<void> {
    const type =
      resourceType ?? (category === MediaCategory.IMAGE ? 'image' : 'raw');
    await cloudinary.uploader.destroy(publicId, { resource_type: type });
  }
}
