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
export function approved(content: { moderationStatus: string; visibility: string }): boolean {
  return ['pending', 'approved'].includes(content.moderationStatus) && content.visibility === 'visible';
}
export function requireReadable(
  content: { moderationStatus: string; visibility: string; authorId: string }, user: GatewayUser,
) {
  if (!approved(content) && !['admin', 'moderator'].includes(user.role ?? '') && content.authorId !== user.id)
    throw new NotFoundException('Content not found');
}
export function requireApproved(content: { moderationStatus: string; visibility: string }) {
  if (!approved(content)) throw new BadRequestException('Post awaits approval');
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
// Lock order is room -> post -> children. Lifecycle operations only lock the room.
export async function lockRoomForWrite(manager: EntityManager, roomId: string | null, check = true) {
  if (!roomId) return;
  const [room] = await manager.query<{ status: string; expired: boolean }[]>(`SELECT status, (closure_at IS NOT NULL AND closure_at <= clock_timestamp()) AS expired FROM rooms WHERE id=$1 FOR SHARE`, [roomId]);
  if (!room) throw new NotFoundException('Room not found');
  if (check && (room.status !== 'active' || room.expired)) throw new ForbiddenException('Room is not accepting new posts');
}
export async function lockPost(manager: EntityManager, id: string, writable = true): Promise<Discussion> {
  const found = await manager.findOneBy(Discussion, { id });
  if (!found) throw new NotFoundException('Discussion not found');
  await lockRoomForWrite(manager, found.roomId, writable);
  const post = await manager.findOne(Discussion, { where: { id }, lock: { mode: 'pessimistic_write' } });
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
