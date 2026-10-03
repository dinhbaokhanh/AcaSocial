import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { OutboxService } from '../events/outbox.service';

@Injectable()
export class MentionService {
  constructor(private readonly config: ConfigService, private readonly outbox: OutboxService) {}

  async emit(
    manager: EntityManager,
    content: string,
    actorId: string,
    context: { entityType: 'comment' | 'answer'; entityId: string; discussionId: string; discussionTitle: string },
  ) {
    const usernames = [...new Set([...content.matchAll(/(?:^|\s)@([a-zA-Z0-9_]{3,20})\b/g)].map((match) => match[1]))].slice(0, 20);
    if (!usernames.length) return;
    let response: Response;
    try {
      response = await fetch(`${this.config.get('IDENTITY_SERVICE_URL', 'http://localhost:8081')}/internal/users/resolve-usernames`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Internal-Token': this.config.get('INTERNAL_SERVICE_TOKEN', '') },
        body: JSON.stringify({ usernames }), signal: AbortSignal.timeout(3000),
      });
    } catch { return; }
    if (!response.ok) return;
    const users = await response.json() as Array<{ id: string; username: string }>;
    for (const mentioned of users.filter((item) => item.id !== actorId)) {
      await this.outbox.event(manager, 'mention.created', {
        recipientId: mentioned.id, actorId, mentionedUsername: mentioned.username, ...context,
      });
    }
  }
}
