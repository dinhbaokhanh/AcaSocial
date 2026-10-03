import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import {
  AcceptAnswerDto,
  CreateAnswerDto,
  UpdateAnswerDto,
} from './answer.dto';
import { AnswersService } from './answers.service';

@Controller()
export class AnswersController {
  constructor(private readonly answers: AnswersService) {}

  @Get('discussions/:id/answers')
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) { return this.answers.list(id, user); }

  @Post('discussions/:id/answers')
  @UseGuards(GatewayAuthGuard)
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAnswerDto,
    @CurrentUser() user: GatewayUser,
  ) { return this.answers.create(id, dto, user); }

  @Patch('answers/:id')
  @UseGuards(GatewayAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnswerDto,
    @CurrentUser() user: GatewayUser,
  ) { return this.answers.update(id, dto, user); }

  @Delete('answers/:id')
  @UseGuards(GatewayAuthGuard)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) { return this.answers.remove(id, user); }

  @Patch('discussions/:id/accepted-answer')
  @UseGuards(GatewayAuthGuard)
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptAnswerDto,
    @CurrentUser() user: GatewayUser,
  ) { return this.answers.accept(id, dto, user); }

  @Delete('discussions/:id/accepted-answer')
  @UseGuards(GatewayAuthGuard)
  revokeAcceptance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: GatewayUser,
  ) { return this.answers.removeAcceptance(id, user); }
}
