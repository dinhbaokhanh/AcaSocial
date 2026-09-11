import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class OutboxService {
  async event(
    manager: EntityManager,
    eventType: string,
    data: Record<string, unknown>,
  ) {
    await manager.query(
      'INSERT INTO discussion_outbox (id, event_type, payload) VALUES ($1,$2,$3)',
      [randomUUID(), eventType, JSON.stringify(data)],
    );
  }
}
