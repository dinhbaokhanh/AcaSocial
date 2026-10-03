import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AcademicUser {
  id: string | null;
  role: string | null;
}

export function userFromRequest(request: { headers: Record<string, string | undefined> }): AcademicUser {
  return {
    id: request.headers['x-user-id'] ?? null,
    role: request.headers['x-user-role'] ?? null,
  };
}

export function requireAdmin(user: AcademicUser): string {
  if (!user.id) throw new UnauthorizedException('Authentication required');
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
  return user.id;
}

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || request.headers['x-internal-token'] !== expected)
      throw new UnauthorizedException('Invalid internal service token');
    return true;
  }
}
