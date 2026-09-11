import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FilterCommentDto, CommentSortBy } from './dto/filter-comment.dto';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { PaginatedResult } from '../common/pagination/paginated-result.interface';
import { NatsPublisher } from '../common/nats/nats.publisher';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Discussion)
    private readonly discussionRepo: Repository<Discussion>,
    private readonly nats: NatsPublisher,
  ) {}

  // ===== CREATE =====

  async create(
    discussionId: string,
    user: GatewayUser,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Kiểm tra bài viết tồn tại
    const discussion = await this.discussionRepo.findOneBy({ id: discussionId });
    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // 2. Validate parent comment (NẾU CÓ)
    // Ngăn chặn việc truyền parentCommentId của bài viết khác vào
    if (dto.parentCommentId) {
      const parentComment = await this.commentRepo.findOneBy({
        id: dto.parentCommentId,
      });

      if (!parentComment) {
        throw new BadRequestException('Parent comment not found');
      }

      if (parentComment.discussionId !== discussionId) {
        throw new BadRequestException(
          'Parent comment does not belong to this discussion',
        );
      }
    }

    // 3. Tạo comment
    const comment = this.commentRepo.create({
      discussionId,
      authorId: user.id,
      content: dto.content,
      parentCommentId: dto.parentCommentId || null,
      isAnonymous: dto.isAnonymous ?? false,
    });
    const saved = await this.commentRepo.save(comment);

    // 4. Tăng commentCount trên discussion
    await this.discussionRepo.increment({ id: discussionId }, 'commentCount', 1);

    // 5. Publish NATS event — fire-and-forget
    // Chỉ notify nếu người comment khác với tác giả bài viết
    if (discussion.authorId !== user.id) {
      void this.nats.publish('comment.created', {
        commentId: saved.id,
        discussionId,
        discussionTitle: discussion.title,
        actorId: saved.isAnonymous ? null : user.id,
        isAnonymous: saved.isAnonymous,
        commentPreview: saved.content.replace(/\s+/g, ' ').trim().slice(0, 180),
        recipientId: discussion.authorId,
      });
    }

    return saved;
  }

  // ===== LIST (Phân trang + N+1 Query Tối ưu) =====

  async findAllByDiscussion(
    discussionId: string,
    filter: FilterCommentDto,
  ): Promise<PaginatedResult<Comment>> {
    const { page = 1, limit = 20, sort } = filter;

    // Phải chắc chắn bài viết tồn tại
    const discussionExists = await this.discussionRepo.existsBy({ id: discussionId });
    if (!discussionExists) {
      throw new NotFoundException('Discussion not found');
    }

    const qb = this.commentRepo
      .createQueryBuilder('c')
      // Chỉ lấy comment gốc (cấp 1)
      .where('c.discussionId = :discussionId', { discussionId })
      .andWhere('c.parentCommentId IS NULL')
      // Eager load 1 cấp replies
      .leftJoinAndSelect('c.replies', 'replies');

    // Sắp xếp
    switch (sort) {
      case CommentSortBy.OLDEST:
        qb.orderBy('c.createdAt', 'ASC');
        break;
      case CommentSortBy.MOST_VOTES:
        qb.orderBy('c.upvoteCount', 'DESC').addOrderBy('c.createdAt', 'DESC');
        break;
      case CommentSortBy.NEWEST:
      default:
        qb.orderBy('c.createdAt', 'DESC');
        break;
    }

    // Luôn sort reply bên trong theo thứ tự oldest để đọc theo luồng
    qb.addOrderBy('replies.createdAt', 'ASC');

    // Phân trang trên comment gốc
    const totalItems = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // ===== UPDATE =====

  async update(
    id: string,
    user: GatewayUser,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const comment = await this.findOneOrFail(id);
    this.assertOwnerOrMod(comment, user);

    if (dto.content !== undefined) comment.content = dto.content;
    if (dto.isAnonymous !== undefined) comment.isAnonymous = dto.isAnonymous;

    return this.commentRepo.save(comment);
  }

  // ===== DELETE (Soft) =====

  async remove(id: string, user: GatewayUser): Promise<{ message: string }> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const comment = await this.findOneOrFail(id);
    this.assertOwnerOrMod(comment, user);

    // Soft delete: đặt cờ deletedAt = now()
    // Không xóa comment con, giao diện sẽ xử lý hiển thị "[Bình luận bị xóa]" cho comment cha
    await this.commentRepo.softRemove(comment);

    // Giảm commentCount trên discussion (chỉ giảm 1)
    // Dùng GREATEST(..., 0) tránh counter âm trong trường hợp race condition
    await this.discussionRepo
      .createQueryBuilder()
      .update(Discussion)
      .set({ commentCount: () => 'GREATEST(comment_count - 1, 0)' })
      .where('id = :id', { id: comment.discussionId })
      .execute();

    return { message: 'Comment deleted successfully' };
  }

  // ===== Helpers =====

  private async findOneOrFail(id: string): Promise<Comment> {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  private assertOwnerOrMod(comment: Comment, user: GatewayUser): void {
    const isOwner = comment.authorId === user.id;
    const isMod =
      user.role !== null && ['admin', 'moderator'].includes(user.role);

    if (!isOwner && !isMod) {
      throw new ForbiddenException(
        'You do not have permission to modify this comment',
      );
    }
  }
}
