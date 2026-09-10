import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InboxEvent } from './entities/inbox-event.entity'
import { Notification } from './entities/notification.entity'

export interface DomainEvent {
  eventId: string
  eventType: string
  data: Record<string, unknown>
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(InboxEvent) private readonly inbox: Repository<InboxEvent>
  ) {}

  async processEvent(event: DomainEvent): Promise<Notification | null> {
    const recipientId = String(
      event.data.recipientId ?? event.data.receiverId ?? ''
    )
    if (!recipientId) return null

    const existing = await this.inbox.findOneBy({ eventId: event.eventId })
    if (existing) return null

    const notification = this.notifications.create({
      recipientId,
      actorId: this.optionalString(event.data.actorId ?? event.data.senderId),
      type: event.eventType,
      title: this.titleFor(event.eventType),
      body: this.bodyFor(event.eventType),
      data: event.data,
      priority: event.eventType.startsWith('system.') ? 'high' : 'normal',
      readAt: null,
    })

    const savedNotification = await this.notifications.save(notification)
    await this.inbox.save({ eventId: event.eventId })
    return savedNotification
  }

  listForUser(recipientId: string, limit: number) {
    return this.notifications.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  async markRead(recipientId: string, id: string) {
    const notification = await this.notifications.findOneBy({ id, recipientId })
    if (!notification) throw new NotFoundException('Notification not found')
    notification.readAt = new Date()
    return this.notifications.save(notification)
  }

  private optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  private titleFor(type: string): string {
    const titles: Record<string, string> = {
      'answer.created': 'Có câu trả lời mới',
      'answer.accepted': 'Câu trả lời của bạn đã được chấp nhận',
      'mention.created': 'Bạn được nhắc đến',
      'badge.awarded': 'Bạn nhận được badge mới',
      'user.followed': 'Bạn có người theo dõi mới',
    }
    return titles[type] ?? 'Thông báo mới'
  }

  private bodyFor(type: string): string {
    const bodies: Record<string, string> = {
      'answer.created': 'Một người dùng vừa trả lời câu hỏi của bạn.',
      'answer.accepted': 'Câu trả lời của bạn vừa được chấp nhận.',
      'mention.created': 'Bạn vừa được nhắc đến trong một cuộc thảo luận.',
      'badge.awarded': 'Bạn vừa đạt được một thành tựu mới.',
      'user.followed': 'Một người dùng vừa bắt đầu theo dõi bạn.',
    }
    return bodies[type] ?? 'Bạn có một thông báo mới trên AcaSocial.'
  }
}
