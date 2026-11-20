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
import type { Request } from "express";
import { PaginationDto } from "../dto/pagination.dto";
import { gatewayUser } from "../gateway-user";
import { RebuildDto } from "./rebuild.dto";
import { ReconciliationService } from "../../service/reconciliation/reconciliation.service";

@Controller("admin/gamification")
export class ReconciliationController {
  constructor(private service: ReconciliationService) {}
  @Post("reconciliation-jobs") enqueue(@Req() req: Request) {
    return this.service.enqueueReconciliation(gatewayUser(req, true));
  }
  @Get("reconciliation-jobs") jobs(
    @Req() req: Request,
    @Query() q: PaginationDto,
  ) {
    gatewayUser(req, true);
    return this.service.jobs(q);
  }
  @Get("reconciliation-jobs/:id/findings") findings(
    @Req() req: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() q: PaginationDto,
  ) {
    gatewayUser(req, true);
    return this.service.findings(id, q);
  }
  @Post("rebuild-jobs") rebuild(@Req() req: Request, @Body() dto: RebuildDto) {
    return this.service.rebuild(dto, gatewayUser(req, true));
  }
}
