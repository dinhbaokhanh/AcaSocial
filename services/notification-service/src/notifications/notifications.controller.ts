import { Controller, Get, Param, Patch, Query, Sse, UseGuards } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { CurrentUserId } from './common/gateway-user';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { Notification } from './entities/notification.entity';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(GatewayAuthGuard)
export class NotificationsController {
  private readonly streams = new Map<string, Subject<{ data: Notification }>>();

  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: ListNotificationsDto) {
    return this.service.listForUser(userId, query.limit);
  }

  @Patch(':id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.markRead(userId, id);
  }

  @Sse('stream')
  stream(@CurrentUserId() userId: string): Observable<{ data: Notification }> {
    let subject = this.streams.get(userId);
    if (!subject) {
      subject = new Subject<{ data: Notification }>();
      this.streams.set(userId, subject);
    }
    return subject.asObservable();
  }

  publish(notification: Notification) {
    this.streams.get(notification.recipientId)?.next({ data: notification });
  }
}