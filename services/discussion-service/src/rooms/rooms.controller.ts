import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { CreateRoomDto, CreateRoomRuleDto, UpdateMembershipDto, UpdateRoomStatusDto } from './room.dto';
import { RoomType } from './room.entity';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  list(
    @CurrentUser() user: GatewayUser,
    @Query('type') type?: RoomType,
    @Query('parentRoomId') parentRoomId?: string,
  ) {
    return this.rooms.list(type, parentRoomId, user);
  }

  @Get(':idOrSlug')
  findOne(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: GatewayUser,
  ) { return this.rooms.findOne(idOrSlug, user); }

  @Post()
  @UseGuards(GatewayAuthGuard)
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: GatewayUser) {
    return this.rooms.create(dto, user);
  }

  @Post(':id/join')
  @UseGuards(GatewayAuthGuard)
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: GatewayUser) {
    return this.rooms.join(id, user);
  }

  @Post(':id/rules')
  @UseGuards(GatewayAuthGuard)
  addRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRoomRuleDto,
    @CurrentUser() user: GatewayUser,
  ) { return this.rooms.addRule(id, dto, user); }

  @Patch(':id/members/:userId')
  @UseGuards(GatewayAuthGuard)
  updateMembership(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() user: GatewayUser,
  ) { return this.rooms.updateMembership(id, userId, dto, user); }

  @Patch(':id/status')
  @UseGuards(GatewayAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
    @CurrentUser() user: GatewayUser,
  ) { return this.rooms.updateStatus(id, dto, user); }
}
