import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { DatabaseTransaction } from "../../database/transaction-manager";

@Injectable()
export class WorkerRepository {
  constructor(private readonly db: DataSource) {}

  findPendingAggregates() {
    return this.db.query<{ aggregate_id: string }[]>(
      `SELECT i.aggregate_id FROM inbox_events i LEFT JOIN aggregate_checkpoints c ON c.aggregate_id=i.aggregate_id
      WHERE i.status='pending' AND i.next_attempt_at<=now() AND i.revision=coalesce(c.revision,0)+1
      ORDER BY i.received_at,i.aggregate_id LIMIT 20`,
    );
  }

  lockOutboxBatch(transaction: DatabaseTransaction) {
    return transaction.query<
      { id: string; event_type: string; payload: Record<string, unknown> }[]
    >(
      "SELECT * FROM gamification_outbox WHERE delivered_at IS NULL AND next_attempt_at<=now() ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED",
    );
  }

  markDelivered(transaction: DatabaseTransaction, id: string) {
    return transaction.query(
      "UPDATE gamification_outbox SET delivered_at=now() WHERE id=$1",
      [id],
    );
  }

  rescheduleDelivery(transaction: DatabaseTransaction, id: string) {
    return transaction.query(
      "UPDATE gamification_outbox SET attempts=attempts+1,next_attempt_at=now()+LEAST(interval '5 seconds'*power(2,LEAST(attempts,6)),interval '5 minutes') WHERE id=$1",
      [id],
    );
  }

  insertFailedEvent(
    eventId: string | null,
    streamSequence: number,
    payload: string,
    error: string,
  ) {
    return this.db.query(
      "INSERT INTO failed_events(event_id,stream_sequence,payload,error) VALUES($1,$2,$3,$4)",
      [eventId, streamSequence, payload, error],
    );
  }
}
