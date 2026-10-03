import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { CastVoteDto } from './dto/cast-vote.dto';
import { TargetType } from './enums/target-type.enum';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';

/**
 * Controller cho Vote — 4 endpoints xử lý vote Discussion và Comment.
 * Dùng @Controller() không prefix vì cần xử lý 2 prefix khác nhau.
 */
@Controller()
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  // ===== VOTE CHO BÀI VIẾT =====

  @Post('discussions/:id/vote')
  @UseGuards(GatewayAuthGuard)
  castDiscussionVote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: CastVoteDto,
  ) {
    return this.votesService.castVote(TargetType.DISCUSSION, id, user, dto);
  }

  @Delete('discussions/:id/vote')
  @UseGuards(GatewayAuthGuard)
  removeDiscussionVote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.votesService.removeVote(TargetType.DISCUSSION, id, user);
  }

  // ===== VOTE CHO BÌNH LUẬN =====

  @Post('comments/:id/vote')
  @UseGuards(GatewayAuthGuard)
  castCommentVote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: CastVoteDto,
  ) {
    return this.votesService.castVote(TargetType.COMMENT, id, user, dto);
  }

  @Delete('comments/:id/vote')
  @UseGuards(GatewayAuthGuard)
  removeCommentVote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.votesService.removeVote(TargetType.COMMENT, id, user);
  }

  @Post('answers/:id/vote')
  @UseGuards(GatewayAuthGuard)
  castAnswerVote(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: GatewayUser, @Body() dto: CastVoteDto) {
    return this.votesService.castVote(TargetType.ANSWER, id, user, dto);
  }

  @Delete('answers/:id/vote')
  @UseGuards(GatewayAuthGuard)
  removeAnswerVote(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: GatewayUser) {
    return this.votesService.removeVote(TargetType.ANSWER, id, user);
  }
}
