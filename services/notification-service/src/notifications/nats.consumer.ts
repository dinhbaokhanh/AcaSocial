import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { connect, consumerOpts, createInbox, JsMsg, StringCodec } from 'nats'
import { NotificationsController } from './notifications.controller'
import { DomainEvent, NotificationsService } from './notifications.service'

@Injectable()
export class NatsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsConsumer.name)
  private connection?: Awaited<ReturnType<typeof connect>>

  constructor(
    private readonly config: ConfigService,
    private readonly service: NotificationsService,
    private readonly controller: NotificationsController
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('NATS_URL', 'nats://localhost:4222')
    const stream = this.config.get<string>('NATS_STREAM', 'ACASOCIAL_EVENTS')
    const consumer = this.config.get<string>(
      'NATS_CONSUMER',
      'notification-service'
    )
    const subject = 'ac.social.>'

    this.connection = await connect({ servers: url })
    const manager = await this.connection.jetstreamManager()

    try {
      await manager.streams.info(stream)
    } catch {
      await manager.streams.add({ name: stream, subjects: [subject] })
    }

    const options = consumerOpts()
    options.durable(consumer)
    options.manualAck()
    options.ackExplicit()
    options.deliverAll()
    options.deliverTo(createInbox())
    options.filterSubject(subject)

    const subscription = await this.connection
      .jetstream()
      .subscribe(subject, options)
    void this.consume(subscription)
    this.logger.log(`Consuming ${stream} events from ${url} on ${subject}`)
  }

  private async consume(subscription: AsyncIterable<JsMsg>) {
    const codec = StringCodec()
    for await (const message of subscription) {
      try {
        const event = JSON.parse(codec.decode(message.data)) as DomainEvent
        if (!event.eventId || !event.eventType)
          throw new Error('Invalid event envelope')
        const notification = await this.service.processEvent(event)
        if (notification) this.controller.publish(notification)
        message.ack()
      } catch (error) {
        this.logger.error(`Failed to process NATS message: ${String(error)}`)
        message.nak(5000)
      }
    }
  }

  async onModuleDestroy() {
    await this.connection?.drain()
  }
}
