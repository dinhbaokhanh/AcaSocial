import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { DatabaseTransaction } from "../../database/transaction-manager";

export type RecoveryItemKind = "gaps" | "references" | "failures" | "inbox";
type RetryableEventKind = "references" | "inbox";

const recoveryQueries = {
  gaps: { table: "recovery_gaps", column: "aggregate_id" },
  references: { table: "source_references", column: "event_id" },
  failures: { table: "failed_events", column: "id" },
  inbox: { table: "inbox_events", column: "event_id" },
};

@Injectable()
export class RecoveryOperationsRepository {
  constructor(private readonly db: DataSource) {}

  listGaps(limit: number, offset: number) {
    return this.db.query(
      "SELECT * FROM recovery_gaps ORDER BY detected_at DESC,aggregate_id LIMIT $1 OFFSET $2",
      [limit, offset],
    );
  }

  listReferences(limit: number, offset: number) {
    return this.db.query(
      "SELECT event_id,manifest->'data'->>'aggregateId' AS aggregate_id,status,attempts,last_error,created_at FROM source_references WHERE status NOT IN ('applied','replay_held') ORDER BY created_at,event_id LIMIT $1 OFFSET $2",
      [limit, offset],
    );
  }

  listFailures(limit: number, offset: number) {
    return this.db.query(
      "SELECT id,event_id,stream_sequence,error,created_at,retried_at FROM failed_events ORDER BY created_at DESC,id LIMIT $1 OFFSET $2",
      [limit, offset],
    );
  }

  listInboxFailures(limit: number, offset: number) {
    return this.db.query(
      `SELECT event_id,aggregate_id,revision,status,attempts,error,next_attempt_at
      FROM inbox_events WHERE status NOT IN ('applied','replay_held') AND error IS NOT NULL
      ORDER BY received_at,event_id LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }

  lockRecoveryItem(
    transaction: DatabaseTransaction,
    kind: RecoveryItemKind,
    id: string,
  ) {
    const { table, column } = recoveryQueries[kind];
    return transaction.query(
      `SELECT 1 FROM ${table} WHERE ${column}=$1 FOR UPDATE`,
      [id],
    );
  }

  findRecoveryItemStatus(
    transaction: DatabaseTransaction,
    kind: RetryableEventKind,
    id: string,
  ) {
    const { table } = recoveryQueries[kind];
    return transaction.query<{ status: string }[]>(
      `SELECT status FROM ${table} WHERE event_id=$1`,
      [id],
    );
  }

  resetGap(transaction: DatabaseTransaction, id: string) {
    return transaction.query(
      `WITH changed AS (UPDATE recovery_gaps SET status='pending',attempts=0,next_retry_at=now()
        WHERE aggregate_id=$1 AND status IN ('pending','needs_intervention') RETURNING aggregate_id)
        SELECT aggregate_id FROM changed`,
      [id],
    );
  }

  resetReference(transaction: DatabaseTransaction, id: string) {
    return transaction.query(
      `WITH changed AS (UPDATE source_references SET status='pending',attempts=0,next_retry_at=now(),claim_token=NULL
        WHERE event_id=$1 AND status IN ('pending','needs_intervention') RETURNING event_id)
        SELECT event_id FROM changed`,
      [id],
    );
  }

  resetInbox(transaction: DatabaseTransaction, id: string) {
    return transaction.query(
      `WITH changed AS (UPDATE inbox_events SET status='pending',attempts=0,next_attempt_at=now()
          WHERE event_id=$1 AND status<>'applied' AND error IS NOT NULL RETURNING event_id)
          SELECT event_id FROM changed`,
      [id],
    );
  }

  lockFailedEvent(transaction: DatabaseTransaction, id: string) {
    return transaction.query<{ payload: string }[]>(
      "SELECT payload FROM failed_events WHERE id=$1 FOR UPDATE",
      [id],
    );
  }

  findReference(transaction: DatabaseTransaction, eventId: string) {
    return transaction.query<
      {
        manifest: {
          data: {
            payloadHash: string;
            aggregateId: string;
            reputationRevision: number;
            payloadBytes: number;
            payloadCharacters: number;
          };
        };
      }[]
    >("SELECT manifest FROM source_references WHERE event_id=$1", [eventId]);
  }

  queueFailedReference(
    transaction: DatabaseTransaction,
    eventId: string,
    manifest: string,
  ) {
    return transaction.query(
      `INSERT INTO source_references(event_id,manifest) VALUES($1,$2)
        ON CONFLICT(event_id) DO UPDATE SET status='pending',attempts=0,next_retry_at=now(),claim_token=NULL
        WHERE source_references.status IN ('pending','needs_intervention')
          AND source_references.manifest->'data' = excluded.manifest->'data'
        RETURNING event_id`,
      [eventId, manifest],
    );
  }

  findExistingEvent(
    transaction: DatabaseTransaction,
    eventId: string,
    aggregateId: string,
    revision: number,
  ) {
    return transaction.query<{ event_id: string; payload_hash: string }[]>(
      "SELECT event_id,payload_hash FROM inbox_events WHERE event_id=$1 OR (aggregate_id=$2 AND revision=$3)",
      [eventId, aggregateId, revision],
    );
  }

  queueFailedEvent(
    transaction: DatabaseTransaction,
    eventId: string,
    aggregateId: string,
    revision: number,
    payload: string,
    hash: string,
  ) {
    return transaction.query(
      `WITH inserted AS (
        INSERT INTO inbox_events(event_id,aggregate_id,revision,payload,payload_hash)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING event_id
      ), rescheduled AS (
        UPDATE inbox_events SET status='pending',attempts=0,next_attempt_at=now()
        WHERE event_id=$1 AND aggregate_id=$2 AND revision=$3 AND payload_hash=$5
          AND status IN ('pending','needs_intervention') AND NOT EXISTS(SELECT 1 FROM inserted)
        RETURNING event_id
      )
      SELECT event_id FROM inserted UNION ALL SELECT event_id FROM rescheduled`,
      [eventId, aggregateId, revision, payload, hash],
    );
  }

  markFailureRetried(transaction: DatabaseTransaction, id: string) {
    return transaction.query(
      "UPDATE failed_events SET retried_at=now() WHERE id=$1",
      [id],
    );
  }

  appendAudit(
    transaction: DatabaseTransaction,
    actorId: string,
    action: string,
    subject: string,
    reason: string,
  ) {
    return transaction.query(
      "INSERT INTO operation_audits(actor_id,action,subject,reason) VALUES($1,$2,$3,$4)",
      [actorId, action, subject, reason],
    );
  }

  findMetrics() {
    return this.db.query(
      `SELECT (SELECT count(*) FROM inbox_events WHERE status='pending') AS pending,
      (SELECT extract(epoch FROM now()-min(received_at)) FROM inbox_events WHERE status='pending') AS oldest_pending_seconds,
      (SELECT count(*) FROM recovery_gaps WHERE status='needs_intervention') AS blocked_gaps,
      (SELECT count(*) FROM source_references WHERE status='needs_intervention') AS blocked_payloads,
      (SELECT count(*) FROM inbox_events WHERE status='needs_intervention') AS blocked_inbox,
      (SELECT count(*) FROM failed_events WHERE retried_at IS NULL) AS failed_events,
      (SELECT count(*) FROM gamification_outbox WHERE delivered_at IS NULL) AS outbox_pending,
      (SELECT extract(epoch FROM now()-min(created_at)) FROM gamification_outbox WHERE delivered_at IS NULL) AS outbox_lag_seconds`,
    );
  }
}
