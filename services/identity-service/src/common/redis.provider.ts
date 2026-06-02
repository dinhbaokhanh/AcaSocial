import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * REDIS_CLIENT là token dùng để inject Redis connection vào bất kỳ service nào.
 * Toàn bộ ứng dụng dùng chung 1 connection pool thay vì mỗi service tự tạo riêng.
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    return new Redis({
      host: config.get<string>('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
    });
  },
};
