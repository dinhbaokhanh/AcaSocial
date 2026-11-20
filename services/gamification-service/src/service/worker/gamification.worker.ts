import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TransactionManager } from "../../database/transaction-manager";
import { WorkerRepository } from "../../repository/worker/worker.repository";
import {
  connect,
  consumerOpts,
  NatsConnection,
  JetStreamPullSubscription,
  StringCodec,
  Events,
} from "nats";
import { ReputationEngine, validateEvent } from "../reputation/reputation.engine";
import { RecoveryService } from "../recovery/recovery.service";
import { ReconciliationService } from "../reconciliation/reconciliation.service";
@Injectable()
export class GamificationWorker implements OnModuleInit, OnModuleDestroy {
  private nc?: NatsConnection;
  private subscription?: JetStreamPullSubscription;
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private recoveryPending?: Promise<void>;
  private replayPending?: Promise<void>;
  private consuming?: Promise<void>;
  private closing = false;
  private nextConnectAt = 0;
  private failures = 0;
  private online = false;
  private logger = new Logger(GamificationWorker.name);
  constructor(
    private readonly repository: WorkerRepository,
    private readonly transactions: TransactionManager,
    private config: ConfigService,
    private engine: ReputationEngine,
    private recovery: RecoveryService,
    private reconciliation: ReconciliationService,
  ) {}
  onModuleInit() {
    const tick = () => {
      if (this.closing || !this.isEnabled()) return;
      if (!this.pending)
        this.pending = this.tick()
          .catch((e) => this.logger.error(String(e)))
          .finally(() => {
            this.pending = undefined;
          });
      if (!this.recoveryPending)
        this.recoveryPending = this.recovery.tick()
          .catch((e) => this.logger.error(`Source recovery: ${String(e)}`))
          .finally(() => { this.recoveryPending = undefined; });
      if (!this.replayPending)
        this.replayPending = this.recovery.tickReplay()
          .catch((e) => this.logger.error(`Journal replay: ${String(e)}`))
          .finally(() => { this.replayPending = undefined; });
    };
    this.timer = setInterval(tick, 1000);
    tick();
  }
  state() {
    return {
      enabled: this.isEnabled(),
      connected: this.online && !!this.nc && !this.nc.isClosed(),
      subscribed: !!this.subscription && !this.subscription.isClosed(),
      reconnectFailures: this.failures,
    };
  }
  private isEnabled() {
    return this.config.get("GAMIFICATION_ENABLED", "true") === "true";
  }
  async onModuleDestroy() {
    this.closing = true;
    clearInterval(this.timer);
    await this.pending;
    this.subscription?.unsubscribe();
    await Promise.all([this.recoveryPending, this.replayPending]);
    await this.nc?.drain();
    await this.consuming;
  }
  async tick() {
    if (this.closing || !this.isEnabled()) return;
    if (
      (!this.nc ||
        this.nc.isClosed() ||
        !this.subscription ||
        this.subscription.isClosed()) &&
      Date.now() >= this.nextConnectAt
    ) {
      try {
        await this.startNats();
        this.failures = 0;
      } catch (e) {
        this.failures++;
        this.nextConnectAt =
          Date.now() +
          Math.min(30000, 1000 * 2 ** Math.min(this.failures, 5)) +
          Math.floor(Math.random() * 500);
        this.logger.warn(String(e));
      }
    }
    if (this.online && this.subscription && !this.subscription.isClosed())
      this.subscription.pull({ batch: 10, expires: 2000 });
    const aggregates = await this.repository.findPendingAggregates();
    for (const row of aggregates) {
      try {
        await this.engine.drain(row.aggregate_id);
      } catch (e) {
        this.logger.error(`Inbox drain for ${row.aggregate_id}: ${String(e)}`);
      }
    }
    await this.transactions.run(async (m) => {
      if (!this.online || !this.nc || this.nc.isClosed()) return;
      const rows = await this.repository.lockOutboxBatch(m);
      for (const row of rows) {
        try {
          await this.nc
            .jetstream()
            .publish(
              `ac.social.${row.event_type}`,
              StringCodec().encode(
                JSON.stringify({
                  eventId: row.id,
                  eventType: row.event_type,
                  data: row.payload,
                }),
              ),
              { msgID: row.id },
            );
          await this.repository.markDelivered(m, row.id);
        } catch (e) {
          await this.repository.rescheduleDelivery(m, row.id);
          this.logger.warn(String(e));
        }
      }
    });
    await this.reconciliation.tick();
  }
  private async startNats() {
    this.subscription?.unsubscribe();
    if (!this.nc || this.nc.isClosed()) {
      this.nc = await connect({
        servers: this.config.get("NATS_URL", "nats://localhost:4222"),
        timeout: 3000,
      });
      this.online = true;
      const connection = this.nc;
      void (async () => {
        for await (const status of connection.status()) {
          if (this.nc !== connection) break;
          if (status.type === Events.Disconnect) this.online = false;
          if (status.type === Events.Reconnect) this.online = true;
        }
      })().catch((e) => this.logger.warn(String(e)));
      void connection.closed().then(() => {
        if (this.nc === connection) this.online = false;
      });
    }
    const nc = this.nc;
    const manager = await nc.jetstreamManager(),
      stream = this.config.get("NATS_STREAM", "ACASOCIAL_EVENTS");
    try {
      await manager.streams.info(stream);
    } catch {
      try {
        await manager.streams.add({ name: stream, subjects: ["ac.social.>"] });
      } catch {
        await manager.streams.info(stream);
      }
    }
    // New pull durable leaves the old push durable intact; inbox dedupe handles V1 replay.
    const opts = consumerOpts();
    opts.durable("gamification-service-v2");
    opts.manualAck();
    opts.ackExplicit();
    opts.deliverAll();
    opts.filterSubject("ac.social.reputation.content.changed");
    opts.bindStream(stream);
    const subscription = await nc
      .jetstream()
      .pullSubscribe("ac.social.reputation.content.changed", opts);
    this.subscription = subscription;
    this.consuming = (async () => {
      for await (const message of subscription) {
        const raw = StringCodec().decode(message.data);
        let event: unknown;
        try {
          event = JSON.parse(raw);
          const version = (event as { data?: { schemaVersion?: number } })?.data
            ?.schemaVersion;
          if (version === 2) await this.recovery.accept(event);
          else {
            validateEvent(event);
            await this.engine.receive(event);
          }
          message.ack();
        } catch (e) {
          const poison =
            e instanceof SyntaxError ||
            /Invalid reputation|Invalid reward|Invalid journal|Conflicting/.test(
              String(e),
            );
          if (poison || message.info.deliveryCount >= 10) {
            try {
              await this.repository.insertFailedEvent(
                (event as { eventId?: string })?.eventId ?? null,
                message.seq,
                raw.slice(0, 1048576),
                String(e).slice(0, 1000),
              );
              message.term();
            } catch {
              message.nak(5000);
            }
          } else message.nak(5000);
          this.logger.error(`Source event ${message.seq}: ${String(e)}`);
        }
      }
    })()
      .catch((e) => this.logger.error(String(e)))
      .finally(() => {
        if (this.subscription === subscription) {
          this.subscription = undefined;
          this.nextConnectAt = Date.now() + 1000;
        }
      });
  }
}
