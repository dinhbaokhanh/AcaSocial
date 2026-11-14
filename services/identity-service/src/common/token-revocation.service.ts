import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { parseTtl } from './parse-ttl.util';
import { REDIS_CLIENT } from './redis.provider';

/**
 * Thu hồi mọi access token đã phát hành của một user.
 *
 * Blacklist theo jti chỉ thu hồi được token đang cầm trong tay. Khi đổi role, đổi/reset
 * mật khẩu hoặc xóa tài khoản, các access token khác của user vẫn còn hạn; Gateway không
 * đọc DB nên không biết passwordChangedAt. Mốc "revoked_before:<userId>" (Unix giây) trong
 * Redis cho Gateway biết phải từ chối token có iat nhỏ hơn mốc này.
 * TTL = thời hạn access token: sau đó mọi token cũ đã tự hết hạn.
 */
@Injectable()
export class TokenRevocationService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async revokeAccessTokens(userId: string): Promise<void> {
    const ttl = parseTtl(this.config.get<string>('JWT_ACCESS_EXPIRES_IN'));
    const now = Math.floor(Date.now() / 1000);
    await this.redis.set(`revoked_before:${userId}`, String(now), 'EX', ttl);
  }
}
