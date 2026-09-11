import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Subject, filter } from "rxjs"
import { InboxEvent } from "./entities/inbox-event.entity"
import { Notification } from "./entities/notification.entity"
import { ConfigService } from '@nestjs/config'
import { contextualBody } from './notification-content'
import { DomainEvent, validateDomainEvent } from './domain-event'
export type { DomainEvent } from './domain-event'

@Injectable()
export class NotificationsService {
  private readonly events = new Subject<Notification>()

  streamForUser(userId: string) {
    return this.events.pipe(
      filter((notification) => notification.recipientId === userId),
    )
  }

  publish(notification: Notification) {
    this.events.next(notification)
  }

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly config: ConfigService,
  ) {}

  async processEvent(event: DomainEvent): Promise<Notification | null> {
    validateDomainEvent(event)
    const recipientId = String(
      event.data.recipientId ?? event.data.receiverId ?? "",
    )
    if (!recipientId) return null

    // The atomic claim below remains the authority for concurrent deliveries.
    // Skip identity lookup for already committed events, even if identity is down.
    if (await this.notifications.manager.existsBy(InboxEvent, { eventId: event.eventId })) return null

    const data = { ...event.data }
    if (event.eventType === 'comment.created') {
      if (data.isAnonymous === true) {
        data.actorId = null
        delete data.actorName
        delete data.senderId
      } else if (data.isAnonymous === false && typeof data.actorId === 'string') {
        // Resolve on the consumer so identity latency never delays posting a comment.
        const base = this.config.get<string>('IDENTITY_SERVICE_URL', 'http://localhost:8081')
        const response = await fetch(`${base}/internal/users/${encodeURIComponent(data.actorId)}/display`, {
          headers: { 'X-Internal-Token': this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN') },
          signal: AbortSignal.timeout(3000),
        })
        if (response.status === 404) data.actorName = 'Người dùng đã xóa tài khoản'
        else {
          if (!response.ok) throw new Error(`Identity display lookup failed: ${response.status}`)
          const profile = await response.json() as { displayName: string }
          if (typeof profile?.displayName !== 'string' || !profile.displayName.trim()) {
            throw new Error('Identity display lookup returned an invalid profile')
          }
          data.actorName = profile.displayName
        }
      }
    }

    return this.notifications.manager.transaction(async (manager) => {
      // Claim the event and persist its notification atomically, including concurrent deliveries.
      const claim = await manager
        .createQueryBuilder()
        .insert()
        .into(InboxEvent)
        .values({ eventId: event.eventId })
        .orIgnore()
        .returning(["eventId"])
        .execute()
      if (claim.raw.length === 0) return null
      return manager.save(
        Notification,
        manager.create(Notification, {
          recipientId,
          actorId: this.optionalString(
            data.actorId ?? data.senderId,
          ),
          type: event.eventType,
          title: this.titleFor(event.eventType),
          body: contextualBody(event.eventType, data) ?? this.bodyFor(event.eventType),
          data,
          priority: event.eventType.startsWith("system.") ? "high" : "normal",
          readAt: null,
        }),
      )
    })
  }

  listForUser(recipientId: string, limit: number) {
    return this.notifications.find({
      where: { recipientId },
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  async markRead(recipientId: string, id: string) {
    const notification = await this.notifications.findOneBy({ id, recipientId })
    if (!notification) throw new NotFoundException("Notification not found")
    // Preserve the first read timestamp, including concurrent requests.
    await this.notifications.createQueryBuilder()
      .update(Notification)
      .set({ readAt: () => 'COALESCE("readAt", CURRENT_TIMESTAMP)' })
      .where({ id, recipientId })
      .execute()
    const saved = await this.notifications.findOneBy({ id, recipientId })
    if (!saved) throw new NotFoundException("Notification not found")
    this.publish(saved)
    return saved
  }

  private optionalString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null
  }

  private titleFor(type: string): string {
    const titles: Record<string, string> = {
      "answer.created": "Có câu trả lời mới",
      "answer.accepted": "Câu trả lời của bạn đã được chấp nhận",
      "mention.created": "Bạn được nhắc đến",
      "badge.awarded": "Bạn nhận được badge mới",
      "user.followed": "Bạn có người theo dõi mới",
      "discussion.created": "Bài viết mới được tạo",
      "comment.created": "Có bình luận mới trên bài viết của bạn",
    }
    return titles[type] ?? "Thông báo mới"
  }

  private bodyFor(type: string): string {
    const bodies: Record<string, string> = {
      "answer.created": "Một người dùng vừa trả lời câu hỏi của bạn.",
      "answer.accepted": "Câu trả lời của bạn vừa được chấp nhận.",
      "mention.created": "Bạn vừa được nhắc đến trong một cuộc thảo luận.",
      "badge.awarded": "Bạn vừa đạt được một thành tựu mới.",
      "user.followed": "Một người dùng vừa bắt đầu theo dõi bạn.",
      "discussion.created": "Bạn vừa tạo một bài viết mới thành công.",
      "comment.created": "Có người vừa bình luận vào bài viết của bạn.",
    }
    return bodies[type] ?? "Bạn có một thông báo mới trên AcaSocial."
  }
}
