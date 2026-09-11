import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { FilterDiscussionDto } from './dto/filter-discussion.dto';
import { AcceptAnswerDto } from './dto/accept-answer.dto';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';
import { StatusDiscussionDto } from './dto/status-discussion.dto';

/**
 * Controller cho CRUD bài viết.
 * Không chứa business logic — chỉ parse params và gọi service.
 *
 * Validation flow:
 * Client → Gateway (JWT verify) → ValidationPipe (DTO check)
 *   → GatewayAuthGuard (X-User-ID check) → Controller → Service
 */
@Controller('discussions')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}
  @Patch(':id/status')
  @UseGuards(GatewayAuthGuard)
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: StatusDiscussionDto,
  ) {
    return this.discussionsService.setStatus(id, user, dto.status);
  }

  /**
   * POST /discussions — Tạo bài viết mới.
   * Yêu cầu đăng nhập (GatewayAuthGuard).
   */
  @Post()
  @UseGuards(GatewayAuthGuard)
  create(@CurrentUser() user: GatewayUser, @Body() dto: CreateDiscussionDto) {
    return this.discussionsService.create(user, dto);
  }

  /**
   * GET /discussions — Danh sách bài viết (public).
   * Hỗ trợ filter, sort, search, phân trang qua query params.
   *
   * Ví dụ: GET /discussions?postType=question&tag=oop&sort=most_votes&page=1
   */
  @Get()
  findAll(
    @Query() filter: FilterDiscussionDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.discussionsService.findAll(filter, user);
  }

  /**
   * GET /discussions/:id — Chi tiết bài viết (public).
   * ParseUUIDPipe tự động reject 400 nếu :id không phải UUID.
   * Tăng view_count mỗi lần truy cập.
   */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.discussionsService.findOne(id, user);
  }

  /**
   * PATCH /discussions/:id — Cập nhật bài viết.
   * Chỉ author hoặc admin/moderator mới được sửa (check trong service).
   */
  @Patch(':id')
  @UseGuards(GatewayAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: UpdateDiscussionDto,
  ) {
    return this.discussionsService.update(id, user, dto);
  }

  /**
   * DELETE /discussions/:id — Soft delete bài viết.
   * Chỉ author hoặc admin/moderator mới được xóa (check trong service).
   */
  @Delete(':id')
  @UseGuards(GatewayAuthGuard)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.discussionsService.remove(id, user);
  }

  /**
   * PATCH /discussions/:id/accept — Chấp nhận câu trả lời cho Question.
   * Yêu cầu: user phải là tác giả của bài viết.
   */
  @Patch(':id/accept')
  @UseGuards(GatewayAuthGuard)
  acceptAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
    @Body() dto: AcceptAnswerDto,
  ) {
    return this.discussionsService.acceptAnswer(id, user, dto);
  }

  /**
   * DELETE /discussions/:id/accept — Hủy chấp nhận câu trả lời.
   * Yêu cầu: user phải là tác giả của bài viết.
   */
  @Delete(':id/accept')
  @UseGuards(GatewayAuthGuard)
  removeAcceptedAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.discussionsService.removeAcceptedAnswer(id, user);
  }
}
