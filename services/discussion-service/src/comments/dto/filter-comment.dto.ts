import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export enum CommentSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  MOST_VOTES = 'most_votes',
}

export class FilterCommentDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('all')
  parentCommentId?: string;
  @IsOptional()
  @IsEnum(CommentSortBy)
  sort?: CommentSortBy = CommentSortBy.NEWEST;
}
