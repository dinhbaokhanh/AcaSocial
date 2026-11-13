import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NatsPublisher } from '../common/nats/nats.publisher';

const POLL_INTERVAL_MS = 500;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
// Dòng đã gửi được giữ lại một thời gian để đối soát rồi mới xóa.
const DELIVERED_RETENTION = '7 days';
// Cứ sau chừng này lần thử lỗi liên tiếp thì ghi log mức error để người vận hành biết.
const ALERT_EVERY_ATTEMPTS = 10;

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
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
    }, POLL_INTERVAL_MS);
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((e) => this.logger.error(String(e)));
    }, CLEANUP_INTERVAL_MS);
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    clearInterval(this.cleanupTimer);
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
        } catch (error) {
          // Không bao giờ bỏ event: thử lại với backoff lũy thừa 5s, 10s, 20s... tối đa 5 phút.
          const attempts = row.attempts + 1;
          await manager.query(
            `UPDATE discussion_outbox
                SET attempts = $2,
                    next_attempt_at = now() + LEAST(interval '5 seconds' * power(2, LEAST($2 - 1, 10)), interval '5 minutes')
              WHERE id = $1`,
            [row.id, attempts],
          );
          if (attempts % ALERT_EVERY_ATTEMPTS === 0)
            this.logger.error(
              `Outbox event ${row.id} (${row.event_type}) still undelivered after ${attempts} attempts: ${String(error)}`,
            );
        }
      }
    });
  }
  private async cleanup() {
    await this.db.query(
      `DELETE FROM discussion_outbox WHERE delivered_at < now() - interval '${DELIVERED_RETENTION}'`,
    );
  }
}
