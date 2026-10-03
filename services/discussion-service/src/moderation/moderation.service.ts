import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { AnswerAcceptance } from '../answers/answer.entity';
import { authenticated, lockPost } from '../common/content-policy';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import { Discussion } from '../discussions/entities/discussion.entity';
import { PostStatus } from '../discussions/enums/post-status.enum';
import { ModerationReview } from '../ai/ai.entity';
import { ReviewContentDto } from './moderation.dto';

export type ReviewTarget = 'discussion';

@Injectable()
export class ModerationService {
  constructor(private readonly db: DataSource) {}

  private requireReviewer(user: GatewayUser) {
    const actor = authenticated(user);
    if (!['admin', 'moderator'].includes(user.role ?? ''))
      throw new ForbiddenException('Admin or moderator role required');
    return actor;
  }

  async queue(user: GatewayUser) {
    this.requireReviewer(user);
    const items = await this.db.getRepository(Discussion).find({
      where: { moderationStatus: 'pending' }, order: { createdAt: 'ASC' }, take: 50,
    });
    return { data: items.map(item => ({
      id: item.id, entityType: 'discussion', content: item.content, title: item.title,
      discussionId: item.id, contentVersion: item.contentVersion, createdAt: item.createdAt,
    })) };
  }

  async review(type: ReviewTarget, id: string, dto: ReviewContentDto, user: GatewayUser) {
    const actor = this.requireReviewer(user);
    if (type !== 'discussion') throw new BadRequestException('Only posts require approval');
    return this.db.transaction(async manager => {
      const post = await lockPost(manager, id);
      if (post.contentVersion !== dto.expectedVersion || post.content !== dto.expectedContent)
        throw new ConflictException('Content changed; reload before reviewing');
      post.moderationStatus = dto.decision === 'allow' ? 'approved' : 'hidden';
      post.visibility = dto.decision === 'allow' ? 'visible' : 'hidden';
      if (dto.decision === 'hide') {
        await manager.update(AnswerAcceptance, { discussionId: id, revokedAt: IsNull() }, {
          revokedAt: new Date(), revokedBy: actor, revokeReason: 'moderation_hidden',
        });
        post.acceptedAnswerId = null;
        post.acceptedCommentId = null;
        if (post.status === PostStatus.SOLVED) post.status = PostStatus.OPEN;
      }
      await manager.save(post);
      await manager.save(ModerationReview, manager.create(ModerationReview, {
        entityType: 'discussion', entityId: id, contentVersion: post.contentVersion,
        decision: dto.decision, reasonCodes: [], note: dto.note ?? '',
        reviewerId: actor, relatedAiRunId: null,
      }));
      return { id, moderationStatus: post.moderationStatus };
    });
  }
}
