import { Global, Module } from '@nestjs/common';
import { RedisProvider, REDIS_CLIENT } from './redis.provider';
import { TokenRevocationService } from './token-revocation.service';

@Global()
@Module({
  providers: [RedisProvider, TokenRevocationService],
  exports: [REDIS_CLIENT, TokenRevocationService],
})
export class RedisModule {}
