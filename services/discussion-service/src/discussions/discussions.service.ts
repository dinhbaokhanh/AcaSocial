import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionMedia } from './entities/discussion-media.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Comment } from '../comments/entities/comment.entity';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { FilterDiscussionDto } from './dto/filter-discussion.dto';
import { AcceptAnswerDto } from './dto/accept-answer.dto';
import { PostStatus } from './enums/post-status.enum';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import {
  authenticated,
  requireReadable,
  requireApproved,
  lockPost,
  requireManager,
  requireOpen,
} from '../common/content-policy';
import { ContentPresenter } from '../common/content-presenter';
import { MediaReferenceService } from '../common/media-reference.service';
import { TargetType } from '../votes/enums/target-type.enum';
import { OutboxService } from '../events/outbox.service';
import { RoomsService } from '../rooms/rooms.service';
import { DiscussionRevision } from './entities/discussion-revision.entity';
import { Answer, AnswerAcceptance } from '../answers/answer.entity';
import { ConflictException } from '@nestjs/common';
import { AcademicReferenceService } from '../common/academic-reference.service';
const guest: GatewayUser = { id: null, role: null };
@Injectable()
export class DiscussionsService {
  constructor(
    private readonly db: DataSource,
    private readonly outbox: OutboxService,
    private readonly presenter: ContentPresenter,
    private readonly media: MediaReferenceService,
    private readonly rooms: RoomsService,
    private readonly academic: AcademicReferenceService,
  ) {}

  async create(user: GatewayUser, dto: CreateDiscussionDto) {
    const authorId = authenticated(user);
    await this.media.validate(dto.mediaIds, authorId);

    // Resolve academic context từ curriculumCourseId (nếu có)
    const selectedContext = dto.curriculumCourseId
      ? await this.academic.context(dto.curriculumCourseId)
      : null;

    // New posts always require an explicit room selected by the user.
    const resolvedRoomId = dto.roomId;
    const roomContext = await this.rooms.assertCanPost(resolvedRoomId, user);

    // Validation: academic context phải khớp với room binding
    if (
      selectedContext && roomContext?.binding?.majorId &&
      selectedContext.majorId !== roomContext.binding.majorId
    ) throw new BadRequestException('Selected course does not belong to the room major');
    if (
      selectedContext && roomContext?.binding?.curriculumCourseId &&
      selectedContext.curriculumCourseId !== roomContext.binding.curriculumCourseId
    ) throw new BadRequestException('Course room fixes the academic context');
    const id = await this.db.transaction(async (m) => {
      const tagIds = [...new Set(dto.tagIds ?? [])];
      const tags = await this.tags(m, tagIds);
      const post = await m.save(
        Discussion,
        m.create(Discussion, {
          moderationStatus: 'pending',
          visibility: 'held',
          title: dto.title,
          content: dto.content,
          postType: dto.postType,
          authorId,
          isAnonymous: dto.isAnonymous ?? false,
          tags,
          roomId: resolvedRoomId,
          majorId: selectedContext?.majorId ?? roomContext?.binding?.majorId ?? null,
          curriculumId: selectedContext?.curriculumId ?? roomContext?.binding?.curriculumId ?? null,
          courseId: selectedContext?.courseId ?? roomContext?.binding?.courseId ?? null,
          curriculumCourseId:
            selectedContext?.curriculumCourseId ?? roomContext?.binding?.curriculumCourseId ?? null,
        }),
      );
      await this.attach(m, post.id, dto.mediaIds ?? []);
      await this.tagCounts(m, tagIds, 1);
      await m.save(DiscussionRevision, m.create(DiscussionRevision, {
        discussionId: post.id,
        contentVersion: 1,
        title: post.title,
        content: post.content,
        revisionType: 'semantic',
        editedBy: authorId,
      }));

      await this.outbox.event(m, 'discussion.created', {
        discussionId: post.id,
        title: post.title,
        recipientId: authorId,
      });
      return post.id;
    });
    return this.findOne(id, user, false);
  }
  async findAll(filter: FilterDiscussionDto, user: GatewayUser = guest) {
    const {
      page = 1,
      limit = 20,
      postType,
      status,
      tag,
      authorId,
      sort,
      search,
    } = filter;
    const qb = this.db
      .getRepository(Discussion)
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.tags', 'tag')
      .leftJoinAndSelect('d.media', 'media');
    if (!['admin', 'moderator'].includes(user.role ?? '')) qb.andWhere("((d.moderationStatus = 'approved' AND d.visibility = 'visible') OR d.authorId = :reviewViewer)", { reviewViewer: user.id });
    if (postType) qb.andWhere('d.postType = :postType', { postType });
    if (filter.roomId) qb.andWhere('d.roomId = :roomId', { roomId: filter.roomId });
    if (!['admin', 'moderator'].includes(user.role ?? ''))
      qb.andWhere(`(d.roomId IS NULL OR d.authorId = :viewer OR NOT EXISTS (
        SELECT 1 FROM rooms private_room WHERE private_room.id = d.room_id AND private_room.visibility = 'private'
      ) OR EXISTS (
        SELECT 1 FROM room_memberships rm
        WHERE rm.room_id = d.room_id AND rm.user_id = :viewer AND rm.status = 'active'
      ))`, { viewer: user.id ?? null });
    if (status) qb.andWhere('d.status = :status', { status });
    if (authorId)
      qb.andWhere('d.authorId = :authorId AND d.isAnonymous = false', {
        authorId,
      });
    if (search) qb.andWhere('d.title ILIKE :search', { search: `%${search}%` });
    if (tag) {
      const slugs = tag
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length)
        qb.andWhere(
          'd.id IN (SELECT dt.discussion_id FROM discussion_tags dt JOIN tags t ON t.id = dt.tag_id WHERE t.slug IN (:...slugs))',
          { slugs },
        );
    }
    if (sort === 'most_votes')
      qb.addSelect('d.upvoteCount - d.downvoteCount', 'net_score').orderBy(
        'net_score',
        'DESC',
      );
    else if (sort === 'most_comments') qb.orderBy('d.commentCount', 'DESC');
    qb.addOrderBy('d.createdAt', sort === 'oldest' ? 'ASC' : 'DESC').addOrderBy(
      'd.id',
      'DESC',
    );
    const [items, totalItems] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data: await this.presenter.many(items, user, TargetType.DISCUSSION),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }
  async findOne(id: string, user: GatewayUser = guest, countView = true) {
    const post = await this.db
      .getRepository(Discussion)
      .findOne({ where: { id }, relations: ['tags', 'media'] });
    if (!post) throw new NotFoundException('Discussion not found');
    requireReadable(post, user);
    if (post.roomId) await this.rooms.findOne(post.roomId, user);
    if (countView)
      await this.db.getRepository(Discussion).increment({ id }, 'viewCount', 1);
    const acceptedAnswer = post.acceptedAnswerId
      ? await this.db.getRepository(Answer).findOneBy({ id: post.acceptedAnswerId })
      : null;
    const answer = !acceptedAnswer && post.acceptedCommentId
      ? await this.db
          .getRepository(Comment)
          .findOneBy({ id: post.acceptedCommentId })
      : null;
    const [result] = await this.presenter.many(
      [post],
      user,
      TargetType.DISCUSSION,
    );
    return {
      ...result,
      acceptedAnswer: (acceptedAnswer ?
        (await this.presenter.many([acceptedAnswer], user, TargetType.ANSWER))[0] : null) ?? (answer
        ? (await this.presenter.many([answer], user, TargetType.COMMENT))[0]
        : null),
    };
  }
  async update(id: string, user: GatewayUser, dto: UpdateDiscussionDto) {
    authenticated(user);
    await this.media.validate(dto.mediaIds, user.id!);
    const tagIds = dto.tagIds === undefined ? undefined : [...new Set(dto.tagIds)];
    await this.db.transaction(async (m) => {
      const post = await lockPost(m, id);
      requireManager(post.authorId, user);
      requireOpen(post);
      if (dto.expectedVersion !== undefined && post.contentVersion !== dto.expectedVersion)
        throw new ConflictException('Discussion changed; reload');
      const contentChanged =
        (dto.title !== undefined && dto.title !== post.title) ||
        (dto.content !== undefined && dto.content !== post.content) ||
        tagIds !== undefined || dto.mediaIds !== undefined;
      if (tagIds !== undefined) {
        const tags = await this.tags(m, tagIds);
        const old = await m.findOneOrFail(Discussion, {
          where: { id },
          relations: ['tags'],
        });
        // Lock all affected tags in one stable order before adjusting their counts.
        await m.query(
          'SELECT id FROM tags WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
          [[...new Set([...old.tags.map((t) => t.id), ...tagIds])]],
        );
        await this.tagCounts(
          m,
          old.tags.filter((t) => !tagIds.includes(t.id)).map((t) => t.id),
          -1,
        );
        await this.tagCounts(
          m,
          tags
            .filter((t) => !old.tags.some((o) => o.id === t.id))
            .map((t) => t.id),
          1,
        );
        post.tags = tags;
      }
      if (dto.title !== undefined) post.title = dto.title;
      if (dto.content !== undefined) post.content = dto.content;
      if (dto.isAnonymous !== undefined) post.isAnonymous = dto.isAnonymous;
      if (contentChanged) {
        post.contentVersion += 1;
        post.moderationStatus = 'pending';
        post.visibility = 'held';
        await m.save(DiscussionRevision, m.create(DiscussionRevision, {
          discussionId: post.id,
          contentVersion: post.contentVersion,
          title: post.title,
          content: post.content,
          revisionType: dto.revisionType ?? 'semantic',
          editedBy: user.id!,
        }));
        { // Any edit requires approval again, so active acceptance is revoked.
          if (post.acceptedAnswerId) {
            await m.update(
              AnswerAcceptance,
              { discussionId: post.id, revokedAt: IsNull() },
              { revokedAt: new Date(), revokedBy: user.id!, revokeReason: 'question_edited' },
            );
            post.acceptedAnswerId = null;
            post.status = PostStatus.OPEN;
          }
          if (post.acceptedCommentId) {
            post.acceptedCommentId = null;
            post.status = PostStatus.OPEN;
          }
        }
      }
      await m.save(post);
      if (dto.mediaIds !== undefined) await this.attach(m, id, dto.mediaIds);
    });
    return this.findOne(id, user, false);
  }
  async remove(id: string, user: GatewayUser) {
    authenticated(user);
    await this.db.transaction(async (m) => {
      const post = await lockPost(m, id);
      requireManager(post.authorId, user);
      const full = await m.findOneOrFail(Discussion, {
        where: { id },
        relations: ['tags'],
      });
      await m.softDelete(Discussion, { id });
      await this.outbox.event(m, 'content.deleted', {
        entityType: 'discussion', entityId: id, roomId: post.roomId,
      });
      await this.tagCounts(
        m,
        full.tags.map((t) => t.id),
        -1,
      );
    });
    return { message: 'Discussion deleted successfully' };
  }
  async acceptAnswer(id: string, user: GatewayUser, dto: AcceptAnswerDto) {
    authenticated(user);
    await this.db.transaction(async (m) => {
      const post = await lockPost(m, id);
      requireApproved(post);
      this.requireQuestionOwner(post, user);
      requireOpen(post);
      const answer = await m.findOneBy(Comment, { id: dto.commentId });
      if (!answer) throw new NotFoundException('Answer not found');
      if (answer.discussionId !== id || answer.parentCommentId)
        throw new BadRequestException(
          'Only a root answer in this question can be accepted',
        );
      if (answer.authorId === post.authorId)
        throw new BadRequestException('You cannot accept your own answer');
      if (post.acceptedCommentId === answer.id) return;
      post.acceptedCommentId = answer.id;
      post.status = PostStatus.SOLVED;
      await m.save(post);
      await this.outbox.event(m, 'answer.accepted', {
        discussionId: id,
        commentId: answer.id,
        recipientId: answer.authorId,
      });
    });
    return this.findOne(id, user, false);
  }
  async removeAcceptedAnswer(id: string, user: GatewayUser) {
    authenticated(user);
    await this.db.transaction(async (m) => {
      const post = await lockPost(m, id);
      this.requireQuestionOwner(post, user);
      requireOpen(post);
      post.acceptedCommentId = null;
      post.status = PostStatus.OPEN;
      await m.save(post);
    });
    return this.findOne(id, user, false);
  }
  async setStatus(id: string, user: GatewayUser, status: PostStatus) {
    authenticated(user);
    if (![PostStatus.OPEN, PostStatus.CLOSED].includes(status))
      throw new BadRequestException('Use accept answer to solve a question');
    if (!['admin', 'moderator'].includes(user.role ?? ''))
      throw new ForbiddenException(
        'Only moderators can close or reopen discussions',
      );
    await this.db.transaction(async (m) => {
      const post = await lockPost(m, id);
      post.status =
        status === PostStatus.OPEN && post.acceptedCommentId
          ? PostStatus.SOLVED
          : status;
      await m.save(post);
    });
    return this.findOne(id, user, false);
  }
  private requireQuestionOwner(post: Discussion, user: GatewayUser) {
    if (post.postType !== 'question')
      throw new BadRequestException('Only questions can have accepted answers');
    if (post.authorId !== user.id)
      throw new ForbiddenException(
        'Only the question author can accept answers',
      );
  }
  private async tags(m: EntityManager, ids: string[]) {
    const tags = await m.findBy(Tag, { id: In(ids) });
    if (tags.length !== ids.length || tags.some((tag) => tag.status !== 'active'))
      throw new BadRequestException('One or more active tags do not exist');
    return tags;
  }
  private async tagCounts(m: EntityManager, ids: string[], delta: number) {
    for (const id of [...ids].sort())
      await m.query(
        'UPDATE tags SET usage_count = GREATEST(usage_count + $1, 0) WHERE id = $2',
        [delta, id],
      );
  }
  private async attach(m: EntityManager, discussionId: string, ids: string[]) {
    await m.delete(DiscussionMedia, { discussionId });
    if (ids.length)
      await m.insert(
        DiscussionMedia,
        ids.map((mediaId, sortOrder) => ({ discussionId, mediaId, sortOrder })),
      );
  }
}
