import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FilterCommentDto } from './dto/filter-comment.dto';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // ===== THAO TÁC THEO BÀI VIẾT =====

  @Post('discussions/:discussionId/comments')
  @UseGuards(GatewayAuthGuard)
  create(
    @Param('discussionId', ParseUUIDPipe) discussionId: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(discussionId, user, dto);
  }

  @Get('discussions/:discussionId/comments')
  findAll(
    @Param('discussionId', ParseUUIDPipe) discussionId: string,
    @Query() filter: FilterCommentDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.commentsService.findAllByDiscussion(discussionId, filter, user);
  }

  // ===== THAO TÁC TRỰC TIẾP TRÊN COMMENT =====

  @Patch('comments/:id')
  @UseGuards(GatewayAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, user, dto);
  }

  @Delete('comments/:id')
  @UseGuards(GatewayAuthGuard)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.commentsService.remove(id, user);
  }
}
