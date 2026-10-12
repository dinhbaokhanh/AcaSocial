import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { ReviewContentDto } from './moderation.dto';
import { ModerationService } from './moderation.service';
import type { ReviewTarget } from './moderation.service';

@Controller('moderation')
@UseGuards(GatewayAuthGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}
  @Get('pending') queue(
    @CurrentUser() user: GatewayUser,
    @Query('status') status = 'pending',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('roomId') roomId?: string,
    @Query('search') search?: string,
  ) {
    if (page < 1 || page > 100000)
      throw new BadRequestException('Invalid page');
    return this.moderation.queue(user, status, page, roomId, search);
  }
  @Patch(':type/:id') review(
    @Param('type') type: ReviewTarget,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewContentDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.moderation.review(type, id, dto, user);
  }
}
