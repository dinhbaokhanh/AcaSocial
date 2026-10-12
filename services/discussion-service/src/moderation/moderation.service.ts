import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { AnswerAcceptance } from '../answers/answer.entity';
import { authenticated, lockPost } from '../common/content-policy';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { Discussion } from '../discussions/entities/discussion.entity';
import { DiscussionMedia } from '../discussions/entities/discussion-media.entity';
import { Tag } from '../tags/entities/tag.entity';
import { PostStatus } from '../discussions/enums/post-status.enum';
import { ReviewContentDto } from './moderation.dto';
import { ModerationReview } from './moderation.entity';
import { RoomsService } from '../rooms/rooms.service';
import { Room } from '../rooms/room.entity';
import { MediaReferenceService } from '../common/media-reference.service';
import { ContentPresenter } from '../common/content-presenter';
import { TargetType } from '../votes/enums/target-type.enum';

export type ReviewTarget = 'discussion';
@Injectable()
export class ModerationService {
  constructor(
    private readonly db: DataSource,
    private readonly rooms: RoomsService,
    private readonly media: MediaReferenceService,
    private readonly presenter: ContentPresenter,
  ) {}

  private async scope(user: GatewayUser) {
    authenticated(user);
    if (['admin', 'moderator'].includes(user.role ?? '')) return null;
    const ids = await this.rooms.managedRoomIds(user);
    if (!ids.length) throw new ForbiddenException('Room manager role required');
    return ids;
  }

  async queue(
    user: GatewayUser,
    status = 'pending',
    page = 1,
    roomId?: string,
    search = '',
  ) {
    const scope = await this.scope(user);
    if (!['pending', 'approved', 'hidden'].includes(status))
      throw new BadRequestException('Invalid status');
    const qb = this.db
      .getRepository(Discussion)
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media');
    if (scope) qb.andWhere('post.roomId IN (:...scope)', { scope });
    if (roomId) qb.andWhere('post.roomId = :roomId', { roomId });
    if (search.trim())
      qb.andWhere(
        "(post.title ILIKE :search OR post.pending_revision->>'title' ILIKE :search OR CAST(post.author_id AS text) ILIKE :search)",
        { search: '%' + search.trim().slice(0, 200) + '%' },
      );
    const counts: Record<string, number> = {};
    for (const state of ['pending', 'approved', 'hidden'])
      counts[state] = await qb
        .clone()
        .andWhere('post.moderationStatus = :state', { state })
        .getCount();
    const [posts, total] = await qb
      .andWhere('post.moderationStatus = :status', { status })
      .orderBy('post.updatedAt', status === 'pending' ? 'ASC' : 'DESC')
      .addOrderBy('post.id', 'ASC')
      .skip((page - 1) * 30)
      .take(30)
      .getManyAndCount();
    const rooms = posts.length
      ? await this.db
          .getRepository(Room)
          .findBy({
            id: In([
              ...new Set(
                posts.map((p) => p.roomId).filter((id): id is string => !!id),
              ),
            ]),
          })
      : [];
    const reviews = posts.length
      ? await this.db
          .getRepository(ModerationReview)
          .find({
            where: {
              entityType: 'discussion',
              entityId: In(posts.map((p) => p.id)),
            },
            order: { createdAt: 'DESC' },
          })
      : [];
    const presented = await this.presenter.many(
      posts,
      user,
      TargetType.DISCUSSION,
    );
    return {
      data: posts.map((post, index) => ({
        id: post.id,
        entityType: 'discussion',
        title:
          post.moderationStatus === 'pending'
            ? (post.pendingRevision?.title ?? post.title)
            : post.title,
        content:
          post.moderationStatus === 'pending'
            ? (post.pendingRevision?.content ?? post.content)
            : post.content,
        contentVersion: post.contentVersion,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: presented[index].author,
        authorId: post.isAnonymous ? null : post.authorId,
        isAnonymous: post.isAnonymous,
        roomId: post.roomId,
        roomName: rooms.find((r) => r.id === post.roomId)?.name ?? 'Room cũ',
        moderationStatus: post.moderationStatus,
        visibility: post.visibility,
        isRevision:
          post.moderationStatus === 'pending' && !!post.pendingRevision,
        moderationNote: post.moderationNote,
        media:
          post.moderationStatus === 'pending' && post.pendingRevision
            ? post.pendingRevision.mediaIds.map((mediaId) => ({ mediaId }))
            : post.media,
        reviews: reviews.filter((r) => r.entityId === post.id),
      })),
      counts,
      meta: { page, totalItems: total, totalPages: Math.ceil(total / 30) },
    };
  }

  async review(
    type: ReviewTarget,
    id: string,
    dto: ReviewContentDto,
    user: GatewayUser,
  ) {
    const actor = authenticated(user);
    const scope = await this.scope(user);
    if (type !== 'discussion')
      throw new BadRequestException('Only posts require approval');
    if (dto.decision !== 'allow' && !dto.note?.trim())
      throw new BadRequestException('Vui lòng nhập lý do xử lý');
    return this.db.transaction(async (manager) => {
      const post = await lockPost(manager, id);
      if (scope && (!post.roomId || !scope.includes(post.roomId)))
        throw new ForbiddenException('Room manager role required');
      if (
        post.moderationStatus !== (dto.expectedModerationStatus ?? 'pending') ||
        post.contentVersion !== dto.expectedVersion ||
        (post.moderationStatus === 'pending'
          ? (post.pendingRevision?.content ?? post.content)
          : post.content) !== dto.expectedContent
      )
        throw new ConflictException('Content changed; reload before reviewing');
      const draft =
        post.moderationStatus === 'pending' ? post.pendingRevision : null;
      if (dto.decision === 'allow') {
        const attachments = draft
          ? draft.mediaIds
          : (await manager.findBy(DiscussionMedia, { discussionId: id })).map(
              (a) => a.mediaId,
            );
        await this.media.validate(attachments);
        if (draft) {
          const tags = await manager.findBy(Tag, { id: In(draft.tagIds) });
          if (
            tags.length !== draft.tagIds.length ||
            tags.some((t) => t.status !== 'active')
          )
            throw new BadRequestException('Thẻ chủ đề không còn khả dụng');
          const full = await manager.findOneOrFail(Discussion, {
            where: { id },
            relations: ['tags'],
          });
          const affected = [
            ...new Set([...full.tags.map((t) => t.id), ...draft.tagIds]),
          ].sort();
          if (affected.length)
            await manager.query(
              'SELECT id FROM tags WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
              [affected],
            );
          for (const tagId of affected) {
            const delta =
              Number(draft.tagIds.includes(tagId)) -
              Number(full.tags.some((t) => t.id === tagId));
            if (delta)
              await manager.query(
                'UPDATE tags SET usage_count = GREATEST(usage_count + $1, 0) WHERE id = $2',
                [delta, tagId],
              );
          }
          post.title = draft.title;
          post.content = draft.content;
          post.isAnonymous = draft.isAnonymous;
          post.tags = tags;
          await manager.delete(DiscussionMedia, { discussionId: id });
          if (attachments.length)
            await manager.insert(
              DiscussionMedia,
              attachments.map((mediaId, sortOrder) => ({
                discussionId: id,
                mediaId,
                sortOrder,
              })),
            );
          post.pendingRevision = null;
        }
        post.moderationStatus = 'approved';
        post.visibility = 'visible';
      } else if (draft && post.visibility === 'visible') {
        // Rejection affects the proposed revision; the published version remains readable.
        post.moderationStatus = 'approved';
      } else {
        post.moderationStatus = 'hidden';
        post.visibility = 'hidden';
      }
      if ((dto.decision === 'allow' && draft) || post.visibility === 'hidden') {
        await manager.update(
          AnswerAcceptance,
          { discussionId: id, revokedAt: IsNull() },
          {
            revokedAt: new Date(),
            revokedBy: actor,
            revokeReason: draft ? 'question_edited' : 'moderation_hidden',
          },
        );
        post.acceptedAnswerId = null;
        post.acceptedCommentId = null;
        if (post.status === PostStatus.SOLVED) post.status = PostStatus.OPEN;
      }
      post.moderationNote = dto.note?.trim() ?? '';
      await manager.save(post);
      await manager.save(
        ModerationReview,
        manager.create(ModerationReview, {
          entityType: 'discussion',
          entityId: id,
          contentVersion: post.contentVersion,
          decision: dto.decision,
          reasonCodes: [],
          note: post.moderationNote,
          reviewerId: actor,
          relatedAiRunId: null,
        }),
      );
      return { id, moderationStatus: post.moderationStatus };
    });
  }
}
