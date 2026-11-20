import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import type { Request } from "express";

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private config: ConfigService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.path === "/health" || req.path === "/health/ready") return true;
    const supplied = req.headers["x-internal-token"],
      expected = this.config.get<string>("INTERNAL_SERVICE_TOKEN");
    if (
      !expected ||
      typeof supplied !== "string" ||
      Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    )
      throw new ForbiddenException("Invalid internal service token");
    return true;
  }
}
