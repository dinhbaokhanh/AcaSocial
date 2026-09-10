import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';
import { PostType } from '../enums/post-type.enum';
import { PostStatus } from '../enums/post-status.enum';

/**
 * 4 kiểu sắp xếp cho danh sách bài viết.
 * Đặt trong file này vì chỉ dùng cho discussions filter.
 */
export enum SortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  MOST_VOTES = 'most_votes',
  MOST_COMMENTS = 'most_comments',
}

/**
 * DTO validate query params cho GET /discussions.
 * Kế thừa PaginationQueryDto (page, limit) + thêm filter/sort/search.
 *
 * Ví dụ: GET /discussions?postType=question&tag=oop,database&sort=most_votes&page=1&limit=10
 */
export class FilterDiscussionDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  // Lọc theo tag slug — nhiều slug phân cách bằng dấu phẩy: "oop,database"
  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsUUID('all')
  authorId?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sort?: SortBy = SortBy.NEWEST;

  // Tìm kiếm trong title (ILIKE — case-insensitive)
  @IsOptional()
  @IsString()
  search?: string;
}
