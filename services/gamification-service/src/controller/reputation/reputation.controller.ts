import { Controller, Get, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { PaginationDto } from "../dto/pagination.dto";
import { gatewayUser } from "../gateway-user";
import { ReputationService } from "../../service/reputation/reputation.service";

@Controller("gamification")
export class ReputationController {
  constructor(private service: ReputationService) {}
  @Get("me") me(@Req() req: Request) {
    return this.service.summary(gatewayUser(req));
  }
  @Get("me/courses") courses(@Req() req: Request, @Query() q: PaginationDto) {
    return this.service.page("courses", gatewayUser(req), q);
  }
  @Get("me/ledger") ledger(@Req() req: Request, @Query() q: PaginationDto) {
    return this.service.page("ledger", gatewayUser(req), q);
  }
  @Get("me/badges") badges(@Req() req: Request, @Query() q: PaginationDto) {
    return this.service.page("badges", gatewayUser(req), q);
  }
  @Get("badges") definitions(@Req() req: Request) {
    gatewayUser(req);
    return this.service.definitions();
  }
}
