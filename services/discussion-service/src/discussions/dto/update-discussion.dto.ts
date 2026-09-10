import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

/**
 * DTO validate dữ liệu khi cập nhật bài viết.
 * Tất cả fields là optional — chỉ cập nhật field được gửi (partial update).
 *
 * Không dùng PartialType(CreateDiscussionDto) vì:
 * - postType: không cho đổi loại bài sau khi tạo
 * - status: dùng endpoint riêng PATCH /discussions/:id/status (Phase 5)
 */
export class UpdateDiscussionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  // Nếu gửi tagIds, phải có ít nhất 1 — tránh bài viết không có tag
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Bài viết phải có ít nhất 1 tag' })
  @IsUUID('all', { each: true })
  tagIds?: string[];

  // Gửi [] = xóa hết media đính kèm
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mediaIds?: string[];

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
