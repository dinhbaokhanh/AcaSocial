import { Global, Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import { NatsModule } from '../common/nats/nats.module';
@Global()
@Module({
  imports: [NatsModule],
  providers: [OutboxService, OutboxWorker],
  exports: [OutboxService],
})
export class EventsModule {}
