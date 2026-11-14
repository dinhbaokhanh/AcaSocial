import { BadRequestException } from '@nestjs/common';
import { RoomLifecycleService } from './room-lifecycle.service';
import { ClosureScheduleDto, CancelClosureDto } from './room.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import {
  UpdateRoomDto,
  CreateRoomDto,
  CreateRoomRuleDto,
  UpdateMembershipDto,
  UpdateRoomStatusDto,
  UpdateRoomPolicyDto,
} from './room.dto';
import { RoomType } from './room.entity';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService, private readonly lifecycle: RoomLifecycleService) {}

  @Get()
  list(
    @CurrentUser() user: GatewayUser,
    @Query('type') type?: RoomType,
    @Query('parentRoomId') parentRoomId?: string,
  ) {
    return this.rooms.list(type, parentRoomId, user);
  }

  @Get(':id/closure-schedule')
  @UseGuards(GatewayAuthGuard)
  scheduleInfo(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: GatewayUser) { return this.lifecycle.current(id, user); }

  @Post(':id/closure-schedule')
  @UseGuards(GatewayAuthGuard)
  schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ClosureScheduleDto, @CurrentUser() user: GatewayUser) { return this.lifecycle.schedule(id, dto, user); }

  @Patch(':id/closure-schedule')
  @UseGuards(GatewayAuthGuard)
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ClosureScheduleDto, @CurrentUser() user: GatewayUser) { return this.lifecycle.schedule(id, dto, user, true); }

  @Post(':id/closure-schedule/cancel')
  @UseGuards(GatewayAuthGuard)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelClosureDto, @CurrentUser() user: GatewayUser) { return this.lifecycle.cancel(id, dto, user); }

  @Get(':idOrSlug')
  findOne(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.findOne(idOrSlug, user);
  }

  @Post()
  @UseGuards(GatewayAuthGuard)
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: GatewayUser) {
    return this.rooms.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(GatewayAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto, @CurrentUser() user: GatewayUser) {
    return this.rooms.update(id, dto, user);
  }

  @Post(':id/join')
  @UseGuards(GatewayAuthGuard)
  join(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.join(id, user);
  }

  @Post(':id/rules')
  @UseGuards(GatewayAuthGuard)
  addRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRoomRuleDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.addRule(id, dto, user);
  }

  @Patch(':id/members/:userId')
  @UseGuards(GatewayAuthGuard)
  updateMembership(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.updateMembership(id, userId, dto, user);
  }

  @Get(':id/members')
  @UseGuards(GatewayAuthGuard)
  members(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.members(id, user);
  }

  @Get(':id/policy-history')
  @UseGuards(GatewayAuthGuard)
  policyHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.policyHistory(id, user);
  }

  @Patch(':id/policy')
  @UseGuards(GatewayAuthGuard)
  policy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomPolicyDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.updatePolicy(id, dto, user);
  }

  @Patch(':id/status')
  @UseGuards(GatewayAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
    @CurrentUser() user: GatewayUser,
  ) {
    return this.rooms.updateStatus(id, dto, user);
  }
}

@Controller('room-announcements')
export class RoomAnnouncementsController {
  constructor(private lifecycle: RoomLifecycleService) {}
  @Get() @UseGuards(GatewayAuthGuard)
  list(@CurrentUser() user: GatewayUser, @Query('page') raw?: string) {
    const page = Number(raw ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Invalid page');
    return this.lifecycle.announcements(user, page);
  }
}
