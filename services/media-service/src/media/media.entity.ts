import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Phân loại file: dùng để áp whitelist validation và tổ chức folder trên Cloudinary
export enum MediaCategory {
  IMAGE    = 'image',
  DOCUMENT = 'document',
  CODE     = 'code',
}

@Entity('media_assets')
export class MediaAsset {
  // UUID nội bộ — dùng làm path param trong API (/media/:id)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cloudinary public_id, chứa dấu "/" → không dùng làm path param
  @Column({ name: 'public_id', unique: true })
  publicId: string;

  // HTTPS URL từ Cloudinary — trả về cho client
  @Column({ name: 'secure_url' })
  secureUrl: string;

  @Column({ length: 20 })
  format: string;

  // Raw MIME type lưu để audit sau này
  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ type: 'enum', enum: MediaCategory })
  category: MediaCategory;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  // SHA-256 content hash — phát hiện duplicate upload
  @Column({ name: 'sha256_hash', length: 64, unique: true })
  sha256Hash: string;

  // UUID lấy từ X-User-ID header (do Gateway inject sau khi verify JWT)
  @Column({ name: 'uploaded_by', length: 36 })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete: không xóa bản ghi, chỉ đánh dấu thời điểm xóa
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt: Date | null;

  // Lưu ai là người thực hiện xóa (chủ file hoặc admin/moderator)
  @Column({ name: 'deleted_by', length: 36, nullable: true, default: null })
  deletedBy: string | null;
}
