import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsPublisher } from './nats.publisher';

@Module({
  imports: [ConfigModule],
  providers: [NatsPublisher],
  exports: [NatsPublisher],
})
export class NatsModule {}
