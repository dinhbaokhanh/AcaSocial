import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Comment } from '../comments/entities/comment.entity';
import { GatewayUser } from './decorators/current-user.decorator';
import { PostStatus } from '../discussions/enums/post-status.enum';

export function authenticated(user: GatewayUser): string {
  if (!user.id) throw new UnauthorizedException('Authentication required');
  return user.id;
}
export function canManage(authorId: string, user: GatewayUser): boolean {
  return (
    !!user.id &&
    (authorId === user.id || ['admin', 'moderator'].includes(user.role ?? ''))
  );
}
export function requireManager(authorId: string, user: GatewayUser) {
  authenticated(user);
  if (!canManage(authorId, user))
    throw new ForbiddenException('You cannot modify this content');
}
export function requireOpen(post: Discussion) {
  if (post.status === PostStatus.CLOSED)
    throw new BadRequestException('This discussion is closed');
}
// All mutations lock the post first, then its children. A single lock order prevents
// accept/delete/vote races and keeps counters in the same transaction as content.
export async function lockPost(
  manager: EntityManager,
  id: string,
): Promise<Discussion> {
  const post = await manager.findOne(Discussion, {
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
  if (!post) throw new NotFoundException('Discussion not found');
  return post;
}
export async function lockCommentPost(manager: EntityManager, id: string) {
  const found = await manager.findOneBy(Comment, { id });
  if (!found) throw new NotFoundException('Comment not found');
  const post = await lockPost(manager, found.discussionId);
  const comment = await manager.findOneBy(Comment, { id });
  if (!comment) throw new NotFoundException('Comment not found');
  return { post, comment };
}
