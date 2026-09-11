import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FilterCommentDto } from './dto/filter-comment.dto';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import {
  authenticated,
  lockCommentPost,
  lockPost,
  requireManager,
  requireOpen,
} from '../common/content-policy';
import { ContentPresenter } from '../common/content-presenter';
import { OutboxService } from '../events/outbox.service';
import { TargetType } from '../votes/enums/target-type.enum';
import { PostStatus } from '../discussions/enums/post-status.enum';

@Injectable()
export class CommentsService {
  constructor(
    private readonly db: DataSource,
    private readonly outbox: OutboxService,
    private readonly presenter: ContentPresenter,
  ) {}
  async create(discussionId: string, user: GatewayUser, dto: CreateCommentDto) {
    const authorId = authenticated(user);
    const saved = await this.db.transaction(async (m) => {
      const post = await lockPost(m, discussionId);
      requireOpen(post);
      const parent = dto.parentCommentId
        ? await m.findOneBy(Comment, { id: dto.parentCommentId })
        : null;
      if (
        dto.parentCommentId &&
        (!parent || parent.discussionId !== discussionId)
      )
        throw new BadRequestException(
          'Parent comment must exist in this discussion',
        );
      const comment = await m.save(
        Comment,
        m.create(Comment, {
          discussionId,
          authorId,
          content: dto.content,
          parentCommentId: parent?.id ?? null,
          isAnonymous: dto.isAnonymous ?? false,
        }),
      );
      await m.increment(Discussion, { id: discussionId }, 'commentCount', 1);
      const recipientId = parent?.authorId ?? post.authorId;
      if (recipientId !== authorId)
        await this.outbox.event(m, 'comment.created', {
          commentId: comment.id,
          discussionId,
          discussionTitle: post.title,
          recipientId,
          actorId: comment.isAnonymous ? null : authorId,
          isAnonymous: comment.isAnonymous,
          commentPreview: comment.content.replace(/\s+/g, ' ').slice(0, 180),
        });
      return comment;
    });
    return (await this.presenter.many([saved], user, TargetType.COMMENT))[0];
  }
  async findAllByDiscussion(
    discussionId: string,
    filter: FilterCommentDto,
    user: GatewayUser = { id: null, role: null },
  ) {
    const post = await this.db
      .getRepository(Discussion)
      .findOneBy({ id: discussionId });
    if (!post) throw new NotFoundException('Discussion not found');
    const { page = 1, limit = 20, sort, parentCommentId } = filter;
    if (
      parentCommentId &&
      !(await this.db
        .getRepository(Comment)
        .findOne({
          where: { id: parentCommentId, discussionId },
          withDeleted: true,
        }))
    )
      throw new NotFoundException('Parent comment not found');
    const qb = this.db
      .getRepository(Comment)
      .createQueryBuilder('c')
      .withDeleted()
      .where('c.discussionId = :discussionId', { discussionId });
    if (parentCommentId)
      qb.andWhere('c.parentCommentId = :parentCommentId', { parentCommentId });
    else qb.andWhere('c.parentCommentId IS NULL');
    qb.andWhere(
      '(c.deletedAt IS NULL OR EXISTS (SELECT 1 FROM comments child WHERE child.parent_comment_id = c.id))',
    );
    if (sort === 'most_votes')
      qb.addSelect('c.upvoteCount - c.downvoteCount', 'net_score').orderBy(
        'net_score',
        'DESC',
      );
    qb.addOrderBy('c.createdAt', sort === 'oldest' ? 'ASC' : 'DESC').addOrderBy(
      'c.id',
      'DESC',
    );
    const [items, totalItems] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const counts: { parent: string; count: number }[] = items.length
      ? await this.db.query(
          'SELECT parent_comment_id AS parent, count(*)::int AS count FROM comments WHERE parent_comment_id = ANY($1::uuid[]) GROUP BY parent_comment_id',
          [items.map((c) => c.id)],
        )
      : [];
    const presented = await this.presenter.many(
      items,
      user,
      TargetType.COMMENT,
    );
    return {
      data: presented.map((item, index) => ({
        ...item,
        kind: item.parentCommentId
          ? 'reply'
          : post.postType === 'question'
            ? 'answer'
            : 'comment',
        replyCount: counts.find((c) => c.parent === item.id)?.count ?? 0,
        canAccept:
          !item.deletedAt &&
          !item.parentCommentId &&
          post.postType === 'question' &&
          post.status !== PostStatus.CLOSED &&
          user.id === post.authorId &&
          items[index].authorId !== user.id,
        canVote: item.canVote && post.status !== PostStatus.CLOSED,
        canManage: item.canManage && post.status !== PostStatus.CLOSED,
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }
  async update(id: string, user: GatewayUser, dto: UpdateCommentDto) {
    authenticated(user);
    const saved = await this.db.transaction(async (m) => {
      const { post, comment } = await lockCommentPost(m, id);
      requireOpen(post);
      requireManager(comment.authorId, user);
      if (dto.content !== undefined) comment.content = dto.content;
      if (dto.isAnonymous !== undefined) comment.isAnonymous = dto.isAnonymous;
      await m.save(comment);

      return comment;
    });
    return (await this.presenter.many([saved], user, TargetType.COMMENT))[0];
  }
  async remove(id: string, user: GatewayUser) {
    authenticated(user);
    await this.db.transaction(async (m) => {
      const { post, comment } = await lockCommentPost(m, id);
      requireOpen(post);
      requireManager(comment.authorId, user);
      await m.softDelete(Comment, { id });
      post.commentCount = Math.max(0, post.commentCount - 1);
      if (post.acceptedCommentId === id) {
        post.acceptedCommentId = null;
        post.status = PostStatus.OPEN;
      }
      await m.save(post);
    });
    return { message: 'Comment deleted successfully' };
  }
}
