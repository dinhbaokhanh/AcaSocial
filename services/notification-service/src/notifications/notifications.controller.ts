import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { Observable, interval, map, merge } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import { CurrentUserId } from "./common/gateway-user";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { Notification } from "./entities/notification.entity";
import { GatewayAuthGuard } from "./gateway-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(GatewayAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: ListNotificationsDto) {
    return this.service.listForUser(userId, query.limit);
  }

  @Patch(":id/read")
  markRead(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.service.markRead(userId, id);
  }

  @Sse("stream")
  stream(@CurrentUserId() userId: string): Observable<MessageEvent> {
    return merge(
      this.service
        .streamForUser(userId)
        .pipe(map((notification) => ({ data: notification }))),
      interval(15000).pipe(map(() => ({ type: "heartbeat", data: "" }))),
    );
  }
}
