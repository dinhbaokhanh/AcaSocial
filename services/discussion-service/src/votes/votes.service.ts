import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Vote } from './entities/vote.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Comment } from '../comments/entities/comment.entity';
import { CastVoteDto } from './dto/cast-vote.dto';
import { TargetType } from './enums/target-type.enum';
import { VoteType } from './enums/vote-type.enum';
import { RoomsService } from '../rooms/rooms.service';
import { Answer } from '../answers/answer.entity';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import {
  authenticated,
  requireApproved,
  lockCommentPost,
  lockPost,
  requireOpen,
} from '../common/content-policy';
@Injectable()
export class VotesService {
  constructor(private readonly db: DataSource, private readonly rooms: RoomsService) {}
  castVote(type: TargetType, id: string, user: GatewayUser, dto: CastVoteDto) {
    return this.setVote(type, id, user, dto.voteType);
  }
  removeVote(type: TargetType, id: string, user: GatewayUser) {
    return this.setVote(type, id, user, null);
  }
  private async setVote(
    targetType: TargetType,
    targetId: string,
    user: GatewayUser,
    voteType: VoteType | null,
  ) {
    const userId = authenticated(user);
    return this.db.transaction(async (m) => {
      let post: Discussion;
      let target: Discussion | Comment | Answer;
      if (targetType === TargetType.DISCUSSION) {
        post = await lockPost(m, targetId); target = post;
      } else if (targetType === TargetType.COMMENT) {
        const locked = await lockCommentPost(m, targetId); post = locked.post; target = locked.comment;
      } else {
        const found = await m.findOneBy(Answer, { id: targetId });
        if (!found) throw new BadRequestException('Answer not found');
        post = await lockPost(m, found.discussionId);
        const locked = await m.findOne(Answer, { where: { id: targetId }, lock: { mode: 'pessimistic_write' } });
        if (!locked) throw new BadRequestException('Answer not found');
        target = locked;
      }
      requireOpen(post);
      requireApproved(post);
      if (post.roomId) await this.rooms.findOne(post.roomId, user);
      if (target.authorId === userId)
        throw new BadRequestException('You cannot vote on your own content');
      const key = { userId, targetType, targetId };
      const existing = await m.findOneBy(Vote, key);
      // POST sets the requested vote; DELETE clears it. Repeating either is safe.
      if (voteType)
        await m.save(Vote, m.create(Vote, { ...existing, ...key, voteType }));
      else await m.delete(Vote, key);
      const counts = await m.query(
        'SELECT count(*) FILTER (WHERE vote_type = $1)::int AS up, count(*) FILTER (WHERE vote_type = $2)::int AS down FROM votes WHERE target_type = $3 AND target_id = $4',
        [VoteType.UPVOTE, VoteType.DOWNVOTE, targetType, targetId],
      );
      await m.update(
        targetType === TargetType.DISCUSSION ? Discussion : targetType === TargetType.COMMENT ? Comment : Answer,
        targetId,
        { upvoteCount: counts[0].up, downvoteCount: counts[0].down },
      );
      return {
        action: voteType ? 'voted' : 'unvoted',
        voteType,
        upvoteCount: counts[0].up,
        downvoteCount: counts[0].down,
      };
    });
  }
}
