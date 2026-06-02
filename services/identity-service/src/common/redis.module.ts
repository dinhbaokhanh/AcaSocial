import { Global, Module } from '@nestjs/common';
import { RedisProvider, REDIS_CLIENT } from './redis.provider';

/**
 * RedisModule là Global module — import một lần ở AppModule,
 * sau đó REDIS_CLIENT có thể inject vào bất kỳ service nào mà không cần import lại.
 */
@Global()
@Module({
  providers: [RedisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
