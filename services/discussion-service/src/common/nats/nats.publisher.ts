import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, StringCodec, NatsConnection, JetStreamClient } from 'nats';
import { randomUUID } from 'crypto';

export interface DomainEventPayload {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
}

const STREAM = 'ACASOCIAL_EVENTS';
const SUBJECT_PREFIX = 'ac.social';
const SUBJECT_WILDCARD = 'ac.social.>';

@Injectable()
export class NatsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsPublisher.name);
  private connection?: NatsConnection;
  private js?: JetStreamClient;
  private readonly codec = StringCodec();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('NATS_URL', 'nats://localhost:4222');
    try {
      this.connection = await connect({ servers: url });
      const manager = await this.connection.jetstreamManager();

      // Đảm bảo stream tồn tại (idempotent — notification-service cũng tạo)
      try {
        await manager.streams.info(STREAM);
      } catch {
        try {
          await manager.streams.add({
            name: STREAM,
            subjects: [SUBJECT_WILDCARD],
          });
        } catch {
          // Another service may have created the stream concurrently.
          await manager.streams.info(STREAM);
        }
      }

      this.js = this.connection.jetstream();
      this.logger.log(`Connected to NATS at ${url}`);
    } catch (error) {
      // Fail startup so the process supervisor can retry instead of silently losing all events.
      this.logger.error(`Failed to connect to NATS: ${String(error)}`);
      await this.connection?.close();
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.connection?.drain();
  }

  /**
   * Publish một domain event lên NATS JetStream.
   * Fire-and-forget — lỗi chỉ log, không throw để không block main flow.
   */
  async publish(
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    if (!this.js) {
      this.logger.warn(
        `NATS not connected — skipping publish for ${eventType}`,
      );
      return;
    }

    const payload: DomainEventPayload = {
      eventId: randomUUID(),
      eventType,
      data,
    };

    const subject = `${SUBJECT_PREFIX}.${eventType}`;

    try {
      await this.js.publish(
        subject,
        this.codec.encode(JSON.stringify(payload)),
      );
      this.logger.debug(`Published ${eventType} → ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish NATS event ${eventType}: ${String(error)}`,
      );
    }
  }
}
