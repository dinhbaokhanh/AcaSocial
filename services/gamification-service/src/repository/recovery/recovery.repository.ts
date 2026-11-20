import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { DatabaseTransaction } from "../../database/transaction-manager";
import type { ReplayScope, SourceReference } from "../../service/recovery/recovery.service";
import type { ReplayItem } from "../../service/reputation/replay-preflight";

export interface PreviewJob {
  id: string;
  export_id: string;
  total_events: number;
  cursor: number;
  lease: string;
  scope: ReplayScope;
}

@Injectable()
export class RecoveryRepository {
  constructor(private readonly db: DataSource) {}

  lockReference(transaction: DatabaseTransaction, eventId: string) {
    return transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `source-reference:${eventId}`,
    ]);
  }

  insertReference(
    transaction: DatabaseTransaction,
    eventId: string,
    manifest: string,
    silent: boolean,
  ) {
    return transaction.query(
      "INSERT INTO source_references(event_id,manifest,silent) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [eventId, manifest, silent],
    );
  }

  findReference(transaction: DatabaseTransaction, eventId: string) {
    return transaction.query<{ manifest: SourceReference }[]>(
      "SELECT manifest FROM source_references WHERE event_id=$1",
      [eventId],
    );
  }

  insertReplay(
    actorId: string,
    reason: string,
    exportId: string,
    totalEvents: number,
    scope: ReplayScope,
  ) {
    return this.db.query(
      "INSERT INTO journal_replay_jobs(actor_id,reason,export_id,total_events,scope) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [actorId, reason, exportId, totalEvents, JSON.stringify(scope)],
    );
  }

  listReplays(limit: number, offset: number) {
    return this.db.query(
      `SELECT j.*, greatest(0,(SELECT count(*) FROM journal_replay_items i
        WHERE i.job_id=j.id AND i.aggregate_id IS NOT NULL)-j.total_events)::integer AS prerequisite_count
        FROM journal_replay_jobs j ORDER BY j.created_at DESC,j.id DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }

  lockReplay(transaction: DatabaseTransaction, id: string) {
    return transaction.query<
      {
        status: string;
        fullyStaged: boolean;
        expired: boolean;
        preflight_complete: boolean;
      }[]
    >(
      `SELECT status,preflight_complete,cursor=total_events AS "fullyStaged",created_at<=now()-interval '1 day' AS expired
        FROM journal_replay_jobs WHERE id=$1 FOR UPDATE`,
      [id],
    );
  }

  resetReplay(transaction: DatabaseTransaction, id: string, status: string) {
    return transaction.query(
      `UPDATE journal_replay_jobs SET status=$2,next_retry_at=now(),last_error=NULL,
          findings='[]'::jsonb,preflight_complete=$2='applying' WHERE id=$1`,
      [id, status],
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

  listReplayItems(transaction: DatabaseTransaction, jobId: string) {
    return transaction.query<ReplayItem[]>(
      `SELECT i.event_id,i.aggregate_id,i.revision,
        CASE WHEN e.status='applied' THEN NULL ELSE i.payload END AS payload,
        i.payload_hash
      FROM journal_replay_items i LEFT JOIN inbox_events e ON e.event_id=i.event_id
      WHERE i.job_id=$1 AND i.aggregate_id IS NOT NULL ORDER BY i.aggregate_id,i.revision`,
      [jobId],
    );
  }

  findAppliedEvent(eventId: string) {
    return this.db.query<{ aggregate_id: string; revision: string }[]>(
      "SELECT aggregate_id,revision FROM inbox_events WHERE event_id=$1 AND status='applied'",
      [eventId],
    );
  }

  findInboxPrerequisite(aggregateId: string, revision: string) {
    return this.db.query<ReplayItem[]>(
      "SELECT event_id,aggregate_id,revision,payload,payload_hash FROM inbox_events WHERE aggregate_id=$1 AND revision=$2 AND status<>'applied'",
      [aggregateId, revision],
    );
  }

  lockPreviewLease(
    transaction: DatabaseTransaction,
    jobId: string,
    lease: string,
  ) {
    return transaction.query<{ staged_bytes: string }[]>(
      "SELECT staged_bytes FROM journal_replay_jobs WHERE id=$1 AND status='previewing' AND next_retry_at=$2::timestamptz FOR UPDATE",
      [jobId, lease],
    );
  }

  stageReplayItem(
    transaction: DatabaseTransaction,
    jobId: string,
    eventId: string,
    aggregateId: string,
    revision: number,
    payload: string | null,
    hash: string | null,
  ) {
    return transaction.query<{ stored_payload: boolean }[]>(
      `INSERT INTO journal_replay_items(job_id,event_id,aggregate_id,revision,payload,payload_hash)
          VALUES($1,$2,$3,$4,$5,$6)
          ON CONFLICT(job_id,event_id) DO UPDATE SET aggregate_id=excluded.aggregate_id,revision=excluded.revision,
            payload=excluded.payload,payload_hash=excluded.payload_hash
          WHERE journal_replay_items.aggregate_id IS NULL
            OR (journal_replay_items.payload IS NULL AND excluded.payload IS NOT NULL)
          RETURNING payload IS NOT NULL AS stored_payload`,
      [jobId, eventId, aggregateId, revision, payload, hash],
    );
  }

  advanceReplay(
    transaction: DatabaseTransaction,
    jobId: string,
    advance: number,
    bytes: number,
  ) {
    return transaction.query(
      "UPDATE journal_replay_jobs SET cursor=cursor+$2,staged_bytes=$3,next_retry_at=now() WHERE id=$1",
      [jobId, advance, bytes],
    );
  }

  finishPreview(
    jobId: string,
    lease: string,
    status: string,
    findings: string,
    error: string | null,
    complete: boolean,
  ) {
    return this.db.query(
      `UPDATE journal_replay_jobs SET status=$3,findings=$4,last_error=$5,preflight_complete=$6
      WHERE id=$1 AND status='previewing' AND next_retry_at=$2::timestamptz`,
      [jobId, lease, status, findings, error, complete],
    );
  }

  claimPreview() {
    return this.db.query<PreviewJob[]>(
      `WITH picked AS (SELECT id FROM journal_replay_jobs WHERE status='previewing' AND next_retry_at<=now()
        ORDER BY next_retry_at,id LIMIT 1 FOR UPDATE SKIP LOCKED),
      claimed AS (UPDATE journal_replay_jobs j SET next_retry_at=now()+interval '2 minutes'
        FROM picked p WHERE j.id=p.id RETURNING j.*)
      SELECT id,export_id,total_events,cursor,scope,next_retry_at::text AS lease FROM claimed`,
    );
  }

  lockNextReplay(transaction: DatabaseTransaction) {
    return transaction.query<{ id: string; scope: ReplayScope }[]>(
      `SELECT id,scope FROM journal_replay_jobs WHERE status='applying' AND preflight_complete
        ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,
    );
  }

  savepointForReplay(transaction: DatabaseTransaction) {
    return transaction.query("SAVEPOINT apply_journal_replay");
  }

  rollbackReplay(transaction: DatabaseTransaction) {
    return transaction.query("ROLLBACK TO SAVEPOINT apply_journal_replay");
  }

  clearReplayPayloads(transaction: DatabaseTransaction, jobId: string) {
    return transaction.query(
      "UPDATE journal_replay_items SET payload=NULL WHERE job_id=$1 AND payload IS NOT NULL",
      [jobId],
    );
  }

  finishReplay(
    transaction: DatabaseTransaction,
    jobId: string,
    status: string,
    findings: string,
    error: string | null,
  ) {
    return transaction.query(
      `UPDATE journal_replay_jobs SET status=$2,findings=$3,last_error=$4,
          preflight_complete=$2='completed',staged_bytes=CASE WHEN $2='completed' THEN 0 ELSE staged_bytes END
        WHERE id=$1`,
      [jobId, status, findings, error],
    );
  }

  claimReferences() {
    return this.db.query<
      {
        event_id: string;
        manifest: SourceReference;
        attempts: number;
        silent: boolean;
        claim_token: string;
      }[]
    >(
      `WITH picked AS (SELECT event_id FROM source_references WHERE status='pending' AND next_retry_at<=now()
        ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED),
        claimed AS (UPDATE source_references r SET next_retry_at=now()+interval '2 minutes',claim_token=gen_random_uuid()
          FROM picked p WHERE r.event_id=p.event_id RETURNING r.*)
        SELECT * FROM claimed`,
    );
  }

  markReferenceApplied(eventId: string, claimToken: string) {
    return this.db.query(
      `UPDATE source_references SET status='applied',last_error=NULL,claim_token=NULL
        WHERE event_id=$1 AND status='pending' AND claim_token=$2`,
      [eventId, claimToken],
    );
  }

  recordReferenceFailure(eventId: string, claimToken: string, error: string, status: string) {
    return this.db.query(
      `UPDATE source_references SET attempts=attempts+1,last_error=$3,status=$4,claim_token=NULL,
          next_retry_at=now()+LEAST(interval '5 seconds'*power(2,attempts),interval '5 minutes')
        WHERE event_id=$1 AND status='pending' AND claim_token=$2`,
      [eventId, claimToken, error, status],
    );
  }

  findAggregatesWithGaps() {
    return this.db.query<{ aggregate_id: string }[]>(
      "SELECT i.aggregate_id FROM inbox_events i LEFT JOIN aggregate_checkpoints c ON c.aggregate_id=i.aggregate_id LEFT JOIN recovery_gaps g ON g.aggregate_id=i.aggregate_id WHERE i.status NOT IN ('applied','replay_held') AND (g.aggregate_id IS NULL OR g.status='resolved') GROUP BY i.aggregate_id,c.revision HAVING min(i.revision)>coalesce(c.revision,0)+1 ORDER BY i.aggregate_id LIMIT 100",
    );
  }

  claimGaps() {
    return this.db.query<
      {
        aggregate_id: string;
        expected_revision: string;
        through_revision: string;
        attempts: number;
        claimed_until: string;
      }[]
    >(
      `WITH picked AS (SELECT g.aggregate_id FROM recovery_gaps g WHERE g.status='pending' AND g.next_retry_at<=now()
          AND NOT EXISTS(SELECT 1 FROM inbox_events e WHERE e.aggregate_id=g.aggregate_id AND e.status='replay_held')
          ORDER BY g.detected_at LIMIT 5 FOR UPDATE SKIP LOCKED),
        claimed AS (UPDATE recovery_gaps r SET next_retry_at=now()+interval '2 minutes' FROM picked p WHERE r.aggregate_id=p.aggregate_id RETURNING r.*)
        SELECT *,next_retry_at::text AS claimed_until FROM claimed`,
    );
  }

  findGapNotificationMode(aggregateId: string) {
    return this.db.query<{ silent: boolean }[]>(
      "SELECT coalesce(bool_or(silent),false) AS silent FROM inbox_events WHERE aggregate_id=$1 AND status='pending'",
      [aggregateId],
    );
  }

  rescheduleGap(
    aggregateId: string,
    expectedRevision: string,
    claimedUntil: string,
  ) {
    return this.db.query(
      `UPDATE recovery_gaps SET attempts=attempts+1,last_attempt_at=now(),next_retry_at=now()+interval '1 second',last_error=NULL
            WHERE aggregate_id=$1 AND status='pending' AND expected_revision=$2 AND next_retry_at=$3::timestamptz`,
      [aggregateId, expectedRevision, claimedUntil],
    );
  }

  recordGapFailure(
    aggregateId: string,
    error: string,
    status: string,
    expectedRevision: string,
    claimedUntil: string,
  ) {
    return this.db.query(
      `UPDATE recovery_gaps SET attempts=attempts+1,last_attempt_at=now(),last_error=$2,status=$3,
              next_retry_at=now()+LEAST(interval '5 seconds'*power(2,attempts),interval '5 minutes')
            WHERE aggregate_id=$1 AND status='pending' AND expected_revision=$4 AND next_retry_at=$5::timestamptz`,
      [aggregateId, error, status, expectedRevision, claimedUntil],
    );
  }
}
