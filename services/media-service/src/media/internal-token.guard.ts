import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const token = context.switchToHttp().getRequest().headers['x-internal-token'];
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (
      !expected || typeof token !== 'string' ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) throw new ForbiddenException('Invalid internal service token');
    return true;
  }
}
