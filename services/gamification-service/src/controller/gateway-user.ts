import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { uuid } from "../service/uuid";

export function gatewayUser(req: Request, admin = false) {
  const id = req.headers["x-user-id"];
  if (typeof id !== "string" || !uuid.test(id))
    throw new UnauthorizedException("Authentication required");
  if (admin && req.headers["x-user-role"] !== "admin")
    throw new ForbiddenException("Admin role required");
  return id;
}
