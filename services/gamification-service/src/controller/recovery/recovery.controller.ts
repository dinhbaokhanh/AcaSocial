import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { IsDateString, IsOptional, IsUUID, Matches } from "class-validator";
import type { Request } from "express";
import { PaginationDto } from "../dto/pagination.dto";
import { ReasonDto } from "../dto/reason.dto";
import { gatewayUser } from "../gateway-user";
import { RecoveryOperationsService } from "../../service/recovery/recovery-operations.service";
import { RecoveryService } from "../../service/recovery/recovery.service";

class ReplayPreviewDto extends ReasonDto {
  @IsOptional() @IsUUID() aggregateId?: string;
  @IsOptional() @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) fromDate?: string;
  @IsOptional() @Matches(/^(?!0000)\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) toDate?: string;
}

@Controller("admin/gamification")
export class RecoveryController {
  constructor(
    private service: RecoveryOperationsService,
    private recovery: RecoveryService,
  ) {}
  @Get("gaps") gaps(@Req() req: Request, @Query() q: PaginationDto) {
    gatewayUser(req, true);
    return this.service.gaps(q);
  }
  @Get("references") references(
    @Req() req: Request,
    @Query() q: PaginationDto,
  ) {
    gatewayUser(req, true);
    return this.service.references(q);
  }
  @Get("failures") failures(@Req() req: Request, @Query() q: PaginationDto) {
    gatewayUser(req, true);
    return this.service.failures(q);
  }
  @Get("inbox") inboxFailures(@Req() req: Request, @Query() q: PaginationDto) {
    gatewayUser(req, true);
    return this.service.inboxFailures(q);
  }
  @Post("inbox/:id/retry") retryInbox(
    @Req() req: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.service.retry("inbox", id, dto.reason, gatewayUser(req, true));
  }
  @Post("gaps/:id/retry") retryGap(
    @Req() req: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.service.retry("gaps", id, dto.reason, gatewayUser(req, true));
  }
  @Post("references/:id/retry") retryReference(
    @Req() req: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.service.retry("references", id, dto.reason, gatewayUser(req, true));
  }
  @Post("failures/:id/retry") retryFailure(
    @Req() req: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.service.retry("failures", id, dto.reason, gatewayUser(req, true));
  }
  @Get("metrics") metrics(@Req() req: Request) {
    gatewayUser(req, true);
    return this.service.metrics();
  }
  @Get("replay-jobs") replayJobs(
    @Req() req: Request,
    @Query() q: PaginationDto,
  ) {
    gatewayUser(req, true);
    return this.recovery.replayJobs(q);
  }
  @Post("replay-jobs") previewReplay(
    @Req() req: Request,
    @Body() dto: ReplayPreviewDto,
  ) {
    const { reason, aggregateId, fromDate, toDate } = dto;
    return this.recovery.previewReplay(gatewayUser(req, true), reason, {
      aggregateId: aggregateId ?? undefined,
      fromDate: fromDate ?? undefined,
      toDate: toDate ?? undefined,
    });
  }
  @Post("replay-jobs/:id/execute") executeReplay(
    @Req() req: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.recovery.executeReplay(id, gatewayUser(req, true), dto.reason);
  }
}
