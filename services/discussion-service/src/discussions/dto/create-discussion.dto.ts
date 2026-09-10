import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { PostType } from '../enums/post-type.enum';

/**
 * DTO validate dữ liệu khi tạo bài viết mới.
 * NestJS ValidationPipe tự động reject request nếu không hợp lệ.
 *
 * Ví dụ request hợp lệ:
 * {
 *   "title": "Hỏi về DI trong NestJS",
 *   "content": "Mình muốn hiểu cơ chế DI...",
 *   "postType": "question",
 *   "tagIds": ["uuid-tag-1", "uuid-tag-2"],
 *   "isAnonymous": false
 * }
 */
export class CreateDiscussionDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(300)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @IsEnum(PostType, { message: 'postType phải là question hoặc discussion' })
  postType: PostType;

  // Phải có ít nhất 1 tag — đảm bảo mọi bài viết đều được phân loại
  @IsArray()
  @ArrayMinSize(1, { message: 'Bài viết phải có ít nhất 1 tag' })
  @IsUUID('all', { each: true })
  tagIds: string[];

  // Media đính kèm (tùy chọn) — chỉ lưu ID, không verify với Media Service
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mediaIds?: string[];

  // Chế độ ẩn danh — authorId vẫn lưu DB (admin bóc mác), nhưng ẩn trên API response
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
