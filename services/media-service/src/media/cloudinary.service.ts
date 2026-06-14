import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { MediaCategory } from './media.entity';

/**
 * CloudinaryService là wrapper mỏng quanh Cloudinary SDK v2.
 *
 * Lý do tách thành service riêng (không gọi thẳng trong MediaService):
 * 1. Dễ mock trong unit test — chỉ cần override CloudinaryService
 * 2. Single Responsibility — MediaService không cần biết chi tiết Cloudinary API
 * 3. Dễ swap CDN provider trong tương lai mà không đụng business logic
 *
 * Folder naming convention trên Cloudinary:
 * - acasocial/images/   → image files
 * - acasocial/documents/ → document files
 * - acasocial/code/     → code files
 * Giúp tổ chức và quản lý resource dễ dàng, không bị lẫn lộn.
 */
@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    // Cấu hình Cloudinary một lần khi service khởi động
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload file buffer lên Cloudinary qua stream.
   *
   * Dùng stream thay vì base64 string vì:
   * - Không cần convert buffer → string (giảm bộ nhớ)
   * - Cloudinary nhận stream trực tiếp, không buffering thêm ở server
   *
   * @param buffer  - File buffer từ multer memoryStorage
   * @param category - Dùng để xác định folder đích trên Cloudinary
   * @returns UploadApiResponse chứa public_id, secure_url, format, ...
   * @throws InternalServerErrorException nếu Cloudinary trả lỗi
   */
  async upload(buffer: Buffer, category: MediaCategory): Promise<UploadApiResponse> {
    const folder = `acasocial/${category}s`; // images / documents / codes

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // Cloudinary tự detect: image / video / raw
          // "raw" bao gồm PDF, document, code files
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

      // Chuyển buffer thành readable stream và pipe vào Cloudinary uploader
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Xóa resource trên Cloudinary theo public_id.
   *
   * resource_type: 'raw' cho document/code vì Cloudinary phân biệt
   * image vs raw khi xóa — nếu sai type sẽ trả 404 dù file vẫn tồn tại.
   *
   * @param publicId  - Cloudinary public_id (vd: "acasocial/images/abc123")
   * @param category  - Xác định resource_type phù hợp
   */
  async destroy(publicId: string, category: MediaCategory): Promise<void> {
    const resourceType = category === MediaCategory.IMAGE ? 'image' : 'raw';
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}
