import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * MediaCategory phân loại file để:
 * 1. Áp đúng whitelist extension + mimetype theo từng nhóm
 * 2. Tổ chức folder trên Cloudinary (acasocial/images/..., acasocial/documents/...)
 * 3. Hội đồng hỏi "phân loại thế nào?" → có enum rõ ràng để giải thích
 */
export enum MediaCategory {
  IMAGE    = 'image',
  DOCUMENT = 'document',
  CODE     = 'code',
}

/**
 * MediaAsset ánh xạ tới bảng "media_assets" trong PostgreSQL.
 *
 * Các quyết định thiết kế quan trọng:
 *
 * 1. id (UUID) — dùng làm path param thay vì publicId.
 *    Lý do: Cloudinary public_id có dạng "acasocial/images/abc123" chứa dấu /,
 *    gây lỗi URL encode/decode khi dùng làm path param (:publicId).
 *    UUID không chứa ký tự đặc biệt, an toàn tuyệt đối trong URL.
 *
 * 2. sha256Hash (unique) — content hash của file buffer.
 *    Lý do: phát hiện duplicate upload. Cùng file upload 2 lần → trả lại record cũ,
 *    không tạo object thừa trên Cloudinary, không tốn storage.
 *
 * 3. deletedAt + deletedBy — soft delete thủ công thay vì @DeleteDateColumn.
 *    Lý do: @DeleteDateColumn chỉ lưu "khi nào" xóa, không lưu "ai" xóa.
 *    Cần cả hai để audit trail đầy đủ (hội đồng sẽ hỏi điểm này).
 *
 * 4. publicId — KHÔNG expose ra response, chỉ dùng nội bộ để gọi Cloudinary.
 *    Lý do: ẩn chi tiết triển khai CDN khỏi client API.
 */
@Entity('media_assets')
export class MediaAsset {
  /** Primary key nội bộ — dùng làm path param trong API */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Cloudinary public_id (vd: "acasocial/images/abc123").
   * Chứa dấu / → KHÔNG bao giờ dùng làm path param.
   * unique: true để đảm bảo không có 2 record trỏ cùng Cloudinary object.
   */
  @Column({ name: 'public_id', unique: true })
  publicId: string;

  /** HTTPS delivery URL từ Cloudinary — trả về cho client để hiển thị/tải */
  @Column({ name: 'secure_url' })
  secureUrl: string;

  /** Định dạng file: 'jpg', 'png', 'pdf', 'py', ... */
  @Column({ length: 20 })
  format: string;

  /**
   * Raw MIME type từ multipart header ('image/jpeg', 'application/pdf', 'text/plain').
   * Giữ nguyên raw để audit — không normalize, không mất thông tin.
   */
  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  /** Phân loại nghiệp vụ — IMAGE / DOCUMENT / CODE */
  @Column({ type: 'enum', enum: MediaCategory })
  category: MediaCategory;

  /** Kích thước file tính bằng bytes */
  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  /**
   * SHA-256 hex hash của file buffer (64 ký tự).
   * unique: true đảm bảo idempotency ở cả DB level (không chỉ application level).
   * Nếu service bị restart giữa chừng, DB vẫn là safety net cuối cùng.
   */
  @Column({ name: 'sha256_hash', length: 64, unique: true })
  sha256Hash: string;

  /**
   * UUID của user đã upload — được inject bởi Gateway từ JWT claim.
   * Không cần FK sang identity-service vì media-service là microservice độc lập.
   * Đây là pattern "shared nothing" — mỗi service tự quản lý data của mình.
   */
  @Column({ name: 'uploaded_by', length: 36 })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Soft delete: ghi timestamp thay vì xóa bản ghi.
   * Lý do: audit trail, khả năng recover, không mất lịch sử.
   * Dùng nullable column thay vì @DeleteDateColumn để tự kiểm soát query.
   */
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt: Date | null;

  /**
   * UUID của người thực hiện xóa — có thể là chủ file hoặc admin/moderator.
   * Đây là lý do KHÔNG dùng @DeleteDateColumn: nó không lưu được thông tin này.
   */
  @Column({ name: 'deleted_by', length: 36, nullable: true, default: null })
  deletedBy: string | null;
}
