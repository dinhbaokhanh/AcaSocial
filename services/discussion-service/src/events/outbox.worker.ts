import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NatsPublisher } from '../common/nats/nats.publisher';

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private readonly logger = new Logger(OutboxWorker.name);
  constructor(
    private readonly db: DataSource,
    private readonly nats: NatsPublisher,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.pending)
        this.pending = this.deliver()
          .catch((e) => this.logger.error(String(e)))
          .finally(() => {
            this.pending = undefined;
          });
    }, 500);
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.pending;
  }
  private async deliver() {
    await this.db.transaction(async (manager) => {
      const rows = await manager.query(
        'SELECT * FROM discussion_outbox WHERE delivered_at IS NULL AND next_attempt_at <= now() ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED',
      );
      for (const row of rows) {
        try {
          await this.nats.publish(row.event_type, row.payload, row.id);
          await manager.query(
            'UPDATE discussion_outbox SET delivered_at = now() WHERE id = $1',
            [row.id],
          );
        } catch {
          await manager.query(
            "UPDATE discussion_outbox SET attempts = attempts + 1, next_attempt_at = now() + interval '5 seconds' WHERE id = $1",
            [row.id],
          );
        }
      }
    });
  }
}
