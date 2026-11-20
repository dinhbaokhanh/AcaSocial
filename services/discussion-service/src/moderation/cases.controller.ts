import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { GatewayAuthGuard } from '../common/guards/gateway-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { GatewayUser } from '../common/decorators/current-user.decorator';
import { CasesService } from './cases.service';

export class ReportDto {
  @IsIn(['discussion']) entityType: 'discussion';
  @IsUUID() entityId: string;
  @IsInt() @Min(1) contentVersion: number;
  @IsIn(['spam', 'harassment', 'hate', 'threat', 'privacy', 'other']) reasonCode: string;
  @IsOptional() @IsString() @MaxLength(2000) details?: string;
}
@Controller()
@UseGuards(GatewayAuthGuard)
export class CasesController {
  constructor(private readonly cases: CasesService) {}
  @Post('content-reports') report(@CurrentUser() user: GatewayUser, @Body() dto: ReportDto) { return this.cases.report(user, dto); }
  @Get('moderation/cases') list(@CurrentUser() user: GatewayUser, @Query('status') status = 'open', @Query('page') page = '1', @Query('roomId') roomId?: string, @Query('reason') reason?: string) { return this.cases.list(user, status, Number(page), roomId, reason); }
  @Post('moderation/cases/:id/claim') claim(@CurrentUser() user: GatewayUser, @Param('id', ParseUUIDPipe) id: string) { return this.cases.claim(user, id); }
}
