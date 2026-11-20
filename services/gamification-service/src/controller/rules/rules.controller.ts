import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { PaginationDto } from "../dto/pagination.dto";
import { gatewayUser } from "../gateway-user";
import { RulesDto } from "./rules.dto";
import { RulesService } from "../../service/rules/rules.service";

@Controller("admin/gamification")
export class RulesController {
  constructor(private service: RulesService) {}
  @Get("rules") rules(@Req() req: Request) {
    gatewayUser(req, true);
    return this.service.current();
  }
  @Post("rules") update(@Req() req: Request, @Body() dto: RulesDto) {
    return this.service.updateRules(dto, gatewayUser(req, true));
  }
  @Get("audits") audits(@Req() req: Request, @Query() q: PaginationDto) {
    gatewayUser(req, true);
    return this.service.audits(q);
  }
}
