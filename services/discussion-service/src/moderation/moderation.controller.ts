import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
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
  @Get('pending') queue(@CurrentUser() user: GatewayUser) {
    return this.moderation.queue(user);
  }
  @Patch(':type/:id') review(
    @Param('type') type: ReviewTarget, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewContentDto, @CurrentUser() user: GatewayUser,
  ) { return this.moderation.review(type, id, dto, user); }
}
