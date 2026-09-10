import { IsUUID } from 'class-validator';

/**
 * DTO validate commentId khi chấp nhận câu trả lời.
 *
 * Ví dụ: PATCH /discussions/:id/accept  { "commentId": "uuid-of-comment" }
 */
export class AcceptAnswerDto {
  @IsUUID('all')
  commentId: string;
}
