import { IsIn } from 'class-validator';
import { PostStatus } from '../enums/post-status.enum';
export class StatusDiscussionDto {
  @IsIn([PostStatus.OPEN, PostStatus.CLOSED])
  status: PostStatus;
}
