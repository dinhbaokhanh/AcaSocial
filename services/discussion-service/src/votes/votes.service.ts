import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Vote } from './entities/vote.entity';
import { Discussion } from '../discussions/entities/discussion.entity';
import { Comment } from '../comments/entities/comment.entity';
import { CastVoteDto } from './dto/cast-vote.dto';
import { TargetType } from './enums/target-type.enum';
import { VoteType } from './enums/vote-type.enum';
import { GatewayUser } from '../common/decorators/current-user.decorator';
import {
  authenticated,
  lockCommentPost,
  lockPost,
  requireOpen,
} from '../common/content-policy';
@Injectable()
export class VotesService {
  constructor(private readonly db: DataSource) {}
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
      const { post, target } =
        targetType === TargetType.DISCUSSION
          ? await lockPost(m, targetId).then((post) => ({ post, target: post }))
          : await lockCommentPost(m, targetId).then(({ post, comment }) => ({
              post,
              target: comment,
            }));
      requireOpen(post);
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
        targetType === TargetType.DISCUSSION ? Discussion : Comment,
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
