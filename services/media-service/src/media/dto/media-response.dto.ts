import { MediaCategory } from '../media.entity';

/**
 * MediaResponseDto — chỉ expose đúng những field client cần.
 *
 * Các field bị ẩn có chủ đích:
 * - publicId  : chi tiết triển khai CDN nội bộ, không liên quan đến client
 * - sha256Hash: thông tin nội bộ để detect duplicate, không cần expose
 * - deletedAt/deletedBy: chỉ dùng cho audit log nội bộ
 */
export class MediaResponseDto {
  /** Internal UUID — client dùng để gọi GET/DELETE /media/:id */
  id: string;

  /** HTTPS URL để hiển thị hoặc tải file */
  secureUrl: string;

  /** Định dạng file: 'jpg', 'png', 'pdf', ... */
  format: string;

  /** Raw MIME type */
  mimeType: string;

  /** Phân loại: image | document | code */
  category: MediaCategory;

  /** Kích thước tính bằng bytes */
  sizeBytes: number;

  /** UUID của người upload */
  uploadedBy: string;

  /** Thời điểm upload */
  createdAt: Date;
}
