import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxEvent } from './entities/inbox-event.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NatsConsumer } from './nats.consumer';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Notification, InboxEvent])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NatsConsumer],
})
export class NotificationsModule {}