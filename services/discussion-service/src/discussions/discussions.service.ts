import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionMedia } from './entities/discussion-media.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Comment } from '../comments/entities/comment.entity';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { FilterDiscussionDto, SortBy } from './dto/filter-discussion.dto';
import { AcceptAnswerDto } from './dto/accept-answer.dto';
import { PostType } from './enums/post-type.enum';
import { PostStatus } from './enums/post-status.enum';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { PaginatedResult } from '../common/pagination/paginated-result.interface';
import { NatsPublisher } from '../common/nats/nats.publisher';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectRepository(Discussion)
    private readonly discussionRepo: Repository<Discussion>,
    @InjectRepository(DiscussionMedia)
    private readonly mediaRepo: Repository<DiscussionMedia>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly nats: NatsPublisher,
  ) {}

  // ===== CREATE =====

  /**
   * Tạo bài viết mới.
   *
   * Flow:
   * 1. Validate tags tồn tại trong DB
   * 2. Tạo discussion entity + liên kết tags
   * 3. Lưu media references (nếu có)
   * 4. Tăng usage_count cho các tags được sử dụng
   * 5. Return discussion đầy đủ kèm relations
   */
  async create(
    user: GatewayUser,
    dto: CreateDiscussionDto,
  ): Promise<Discussion> {
    // GatewayAuthGuard đảm bảo user.id tồn tại,
    // nhưng TypeScript không biết → thêm runtime check cho type safety
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Validate tags tồn tại trong DB
    const tags = await this.tagRepo.findBy({ id: In(dto.tagIds) });
    if (tags.length !== dto.tagIds.length) {
      throw new BadRequestException('Một hoặc nhiều tag không tồn tại');
    }

    // 2. Tạo discussion
    const discussion = this.discussionRepo.create({
      title: dto.title,
      content: dto.content,
      postType: dto.postType,
      authorId: user.id,
      isAnonymous: dto.isAnonymous ?? false,
      tags,
    });
    const saved = await this.discussionRepo.save(discussion);

    // 3. Lưu media references (nếu có) — chỉ lưu ID, không verify với Media Service
    if (dto.mediaIds?.length) {
      const mediaEntries = dto.mediaIds.map((mediaId, index) =>
        this.mediaRepo.create({
          discussionId: saved.id,
          mediaId,
          sortOrder: index,
        }),
      );
      await this.mediaRepo.save(mediaEntries);
    }

    // 4. Tăng usage_count cho tags — để hiển thị "tag phổ biến"
    await this.tagRepo
      .createQueryBuilder()
      .update(Tag)
      .set({ usageCount: () => 'usage_count + 1' })
      .whereInIds(dto.tagIds)
      .execute();

    const result = await this.findOneOrFail(saved.id);

    // Publish NATS event — fire-and-forget, không block response
    void this.nats.publish('discussion.created', {
      discussionId: result.id,
      title: result.title,
      postType: result.postType,
      authorId: user.id,
      // recipientId = authorId: notification-service dùng để route SSE
      // (trong thực tế có thể route đến followers sau)
      recipientId: user.id,
      actorId: user.id,
    });

    return result;
  }

  // ===== LIST (phân trang + filter + sort) =====

  /**
   * Danh sách bài viết có phân trang, filter, sort, search.
   *
   * Flow:
   * 1. Tạo QueryBuilder + join relations
   * 2. Áp dụng filters (postType, status, authorId, search, tag)
   * 3. Áp dụng sort (newest/oldest/most_votes/most_comments)
   * 4. Đếm tổng (distinct để tránh trùng khi filter nhiều tags)
   * 5. Phân trang (skip + take)
   */
  async findAll(
    filter: FilterDiscussionDto,
  ): Promise<PaginatedResult<Discussion>> {
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

    const qb = this.discussionRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.tags', 'tag')
      .leftJoinAndSelect('d.media', 'media');

    // --- Filters ---
    if (postType) {
      qb.andWhere('d.postType = :postType', { postType });
    }
    if (status) {
      qb.andWhere('d.status = :status', { status });
    }
    if (authorId) {
      qb.andWhere('d.authorId = :authorId', { authorId });
    }
    if (search) {
      qb.andWhere('d.title ILIKE :search', { search: `%${search}%` });
    }

    // Filter theo tag slug — nhiều slug dấu phẩy: "oop,database"
    if (tag) {
      const slugs = tag.split(',').map((s) => s.trim());
      // Subquery: tìm discussion_id có tag.slug nằm trong danh sách
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('dt.discussion_id')
          .from('discussion_tags', 'dt')
          .innerJoin('tags', 't', 't.id = dt.tag_id')
          .where('t.slug IN (:...slugs)')
          .getQuery();
        return `d.id IN ${subQuery}`;
      }).setParameter('slugs', slugs);
    }

    // --- Sort ---
    switch (sort) {
      case SortBy.OLDEST:
        qb.orderBy('d.createdAt', 'ASC');
        break;
      case SortBy.MOST_VOTES:
        qb.orderBy('d.upvoteCount', 'DESC').addOrderBy('d.createdAt', 'DESC');
        break;
      case SortBy.MOST_COMMENTS:
        qb.orderBy('d.commentCount', 'DESC').addOrderBy('d.createdAt', 'DESC');
        break;
      case SortBy.NEWEST:
      default:
        qb.orderBy('d.createdAt', 'DESC');
    }

    // --- Pagination ---
    // Clone QB riêng cho count — tránh distinct(true) ảnh hưởng getMany()
    // PostgreSQL sẽ lỗi nếu SELECT DISTINCT + ORDER BY cột không nằm trong SELECT list
    const countQb = qb.clone();
    const totalItems = await countQb.distinct(true).getCount();

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

  // ===== GET DETAIL =====

  /**
   * Chi tiết bài viết — tăng view_count fire-and-forget.
   *
   * Tại sao fire-and-forget? View count không critical — nếu +1 thất bại,
   * user vẫn cần nhận response. Tránh thêm latency cho read endpoint.
   */
  async findOne(id: string): Promise<Discussion> {
    const discussion = await this.findOneOrFail(id);

    // Tăng view_count — fire-and-forget, không await, không block response
    this.discussionRepo.increment({ id }, 'viewCount', 1);

    return discussion;
  }

  // ===== UPDATE =====

  /**
   * Cập nhật bài viết — chỉ author hoặc admin/moderator.
   *
   * Flow:
   * 1. Tìm discussion + relations
   * 2. Kiểm tra quyền (owner hoặc admin/mod)
   * 3. Cập nhật fields cơ bản (chỉ field được gửi)
   * 4. Cập nhật tags + sync usage_count (nếu gửi tagIds)
   * 5. Cập nhật media — xóa cũ, tạo mới (nếu gửi mediaIds)
   * 6. Save + return đầy đủ
   */
  async update(
    id: string,
    user: GatewayUser,
    dto: UpdateDiscussionDto,
  ): Promise<Discussion> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const discussion = await this.findOneOrFail(id);
    this.assertOwnerOrMod(discussion, user);

    // Cập nhật fields cơ bản — chỉ field được gửi (partial update)
    if (dto.title !== undefined) discussion.title = dto.title;
    if (dto.content !== undefined) discussion.content = dto.content;
    if (dto.isAnonymous !== undefined) discussion.isAnonymous = dto.isAnonymous;

    // Cập nhật tags (nếu gửi) + sync usage_count
    if (dto.tagIds) {
      const newTags = await this.tagRepo.findBy({ id: In(dto.tagIds) });
      if (newTags.length !== dto.tagIds.length) {
        throw new BadRequestException('Một hoặc nhiều tag không tồn tại');
      }

      // Tính diff old vs new để sync usage_count chính xác
      const oldTagIds = discussion.tags.map((t) => t.id);
      const removedIds = oldTagIds.filter((tid) => !dto.tagIds!.includes(tid));
      const addedIds = dto.tagIds.filter((tid) => !oldTagIds.includes(tid));

      // Giảm counter tags bị bỏ
      if (removedIds.length > 0) {
        await this.tagRepo
          .createQueryBuilder()
          .update(Tag)
          .set({ usageCount: () => 'GREATEST(usage_count - 1, 0)' })
          .whereInIds(removedIds)
          .execute();
      }

      // Tăng counter tags mới thêm
      if (addedIds.length > 0) {
        await this.tagRepo
          .createQueryBuilder()
          .update(Tag)
          .set({ usageCount: () => 'usage_count + 1' })
          .whereInIds(addedIds)
          .execute();
      }

      discussion.tags = newTags;
    }

    // Cập nhật media (nếu gửi) — strategy: xóa cũ, tạo mới
    // Gửi mediaIds: [] = xóa hết media
    if (dto.mediaIds !== undefined) {
      await this.mediaRepo.delete({ discussionId: id });
      if (dto.mediaIds.length > 0) {
        const mediaEntries = dto.mediaIds.map((mediaId, index) =>
          this.mediaRepo.create({ discussionId: id, mediaId, sortOrder: index }),
        );
        await this.mediaRepo.save(mediaEntries);
      }
    }

    await this.discussionRepo.save(discussion);
    return this.findOneOrFail(id);
  }

  // ===== DELETE (soft) =====

  /**
   * Soft delete bài viết — chỉ set deleted_at, không xóa row.
   * Giảm usage_count cho tags đã gắn.
   */
  async remove(
    id: string,
    user: GatewayUser,
  ): Promise<{ message: string }> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const discussion = await this.findOneOrFail(id);
    this.assertOwnerOrMod(discussion, user);

    await this.discussionRepo.softRemove(discussion);

    // Giảm usage_count cho tags — GREATEST(..., 0) tránh counter âm
    const tagIds = discussion.tags.map((t) => t.id);
    if (tagIds.length > 0) {
      await this.tagRepo
        .createQueryBuilder()
        .update(Tag)
        .set({ usageCount: () => 'GREATEST(usage_count - 1, 0)' })
        .whereInIds(tagIds)
        .execute();
    }

    return { message: 'Discussion deleted successfully' };
  }

  // ===== ACCEPTED ANSWER =====

  /**
   * Chấp nhận 1 comment làm câu trả lời đúng cho bài dạng Question.
   *
   * Quy tắc:
   * - Chỉ bài viết dạng QUESTION mới có accepted answer
   * - Chỉ tác giả bài viết được quyền chọn (admin/mod KHÔNG can thiệp)
   * - Comment phải thuộc đúng bài viết
   * - Có thể đổi câu trả lời bất kỳ lúc nào
   * - Tự động chuyển status → SOLVED
   */
  async acceptAnswer(
    id: string,
    user: GatewayUser,
    dto: AcceptAnswerDto,
  ): Promise<Discussion> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const discussion = await this.findOneOrFail(id);

    // Chỉ bài viết dạng QUESTION mới hỗ trợ accepted answer
    if (discussion.postType !== PostType.QUESTION) {
      throw new BadRequestException(
        'Only questions can have accepted answers',
      );
    }

    // Chỉ tác giả bài viết được quyền chọn câu trả lời
    if (discussion.authorId !== user.id) {
      throw new ForbiddenException(
        'Only the question author can accept answers',
      );
    }

    // Validate comment tồn tại và thuộc đúng bài viết
    const comment = await this.commentRepo.findOneBy({ id: dto.commentId });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.discussionId !== id) {
      throw new BadRequestException(
        'This comment does not belong to this discussion',
      );
    }

    // Gán accepted answer + chuyển status sang SOLVED
    discussion.acceptedCommentId = dto.commentId;
    discussion.status = PostStatus.SOLVED;
    await this.discussionRepo.save(discussion);

    return this.findOneOrFail(id);
  }

  /**
   * Hủy chấp nhận câu trả lời — chuyển status về OPEN.
   */
  async removeAcceptedAnswer(
    id: string,
    user: GatewayUser,
  ): Promise<Discussion> {
    if (!user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const discussion = await this.findOneOrFail(id);

    if (discussion.postType !== PostType.QUESTION) {
      throw new BadRequestException(
        'Only questions can have accepted answers',
      );
    }

    if (discussion.authorId !== user.id) {
      throw new ForbiddenException(
        'Only the question author can remove accepted answers',
      );
    }

    if (!discussion.acceptedCommentId) {
      throw new BadRequestException(
        'This question has no accepted answer',
      );
    }

    // Xóa accepted answer + chuyển status về OPEN
    discussion.acceptedCommentId = null as any;
    discussion.status = PostStatus.OPEN;
    await this.discussionRepo.save(discussion);

    return this.findOneOrFail(id);
  }

  // ===== Helpers =====

  /**
   * Tìm discussion kèm relations, throw 404 nếu không tồn tại.
   * TypeORM tự động exclude soft-deleted records.
   */
  private async findOneOrFail(id: string): Promise<Discussion> {
    const discussion = await this.discussionRepo.findOne({
      where: { id },
      relations: ['tags', 'media'],
    });
    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }
    return discussion;
  }

  /**
   * Kiểm tra user là author hoặc admin/moderator.
   *
   * | user.role    | Là author | Kết quả       |
   * |-------------|-----------|---------------|
   * | student     | ✅        | Cho phép      |
   * | student     | ❌        | 403 Forbidden |
   * | admin       | Bất kỳ    | Cho phép      |
   * | moderator   | Bất kỳ    | Cho phép      |
   * | teacher     | ❌        | 403 Forbidden |
   */
  private assertOwnerOrMod(discussion: Discussion, user: GatewayUser): void {
    const isOwner = discussion.authorId === user.id;
    const isMod =
      user.role !== null && ['admin', 'moderator'].includes(user.role);

    if (!isOwner && !isMod) {
      throw new ForbiddenException(
        'You do not have permission to modify this discussion',
      );
    }
  }
}
