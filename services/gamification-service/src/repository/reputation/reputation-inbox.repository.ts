import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "../../database/transaction-manager";
import type { Rules } from "../../service/rules/rules";
import type {
  ReputationEvent,
  Reward,
} from "../../service/reputation/reputation.engine";
import type { ReplayItem, ReplayQuotaBucket, ReplayQuotaEvidence } from "../../service/reputation/replay-preflight";

export interface Entitlement {
  reward_key: string;
  beneficiary_id: string;
  actor_id: string;
  scope: string;
  category: Reward["category"];
  original_at: Date;
  decision_business_date: string | null;
  amount: number | null;
  rule_version: number;
  active: boolean;
  suppressed: boolean;
}
@Injectable()
export class ReputationInboxRepository {
  lockAggregate(transaction: DatabaseTransaction, aggregateId: string) {
    return transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `aggregate:${aggregateId}`,
    ]);
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

  insertEvent(
    transaction: DatabaseTransaction,
    eventId: string,
    aggregateId: string,
    revision: number,
    payload: string,
    hash: string,
    silent: boolean,
  ) {
    return transaction.query(
      "INSERT INTO inbox_events(event_id,aggregate_id,revision,payload,payload_hash,silent) VALUES($1,$2,$3,$4,$5,$6)",
      [eventId, aggregateId, revision, payload, hash, silent],
    );
  }

  ensureCheckpoint(transaction: DatabaseTransaction, aggregateId: string) {
    return transaction.query(
      "INSERT INTO aggregate_checkpoints(aggregate_id) VALUES($1) ON CONFLICT DO NOTHING",
      [aggregateId],
    );
  }

  lockCheckpoint(transaction: DatabaseTransaction, aggregateId: string) {
    return transaction.query<{ revision: string }[]>(
      "SELECT revision FROM aggregate_checkpoints WHERE aggregate_id=$1 FOR UPDATE",
      [aggregateId],
    );
  }

  lockPendingEvent(
    transaction: DatabaseTransaction,
    aggregateId: string,
    revision: number,
  ) {
    return transaction.query<
      {
        event_id: string;
        payload: ReputationEvent;
        silent: boolean;
        attempts: number;
      }[]
    >(
      `SELECT event_id,payload,silent,attempts FROM inbox_events
          WHERE aggregate_id=$1 AND revision=$2 AND status='pending' AND next_attempt_at<=now() FOR UPDATE`,
      [aggregateId, revision],
    );
  }

  savepointForEvent(transaction: DatabaseTransaction) {
    return transaction.query("SAVEPOINT apply_reputation_event");
  }

  rollbackEvent(transaction: DatabaseTransaction) {
    return transaction.query("ROLLBACK TO SAVEPOINT apply_reputation_event");
  }

  recordEventFailure(
    transaction: DatabaseTransaction,
    eventId: string,
    error: string,
    status: string,
  ) {
    return transaction.query(
      `UPDATE inbox_events SET attempts=attempts+1,error=$2,status=$3,
              next_attempt_at=now()+LEAST(interval '5 seconds'*power(2,attempts),interval '5 minutes')
            WHERE event_id=$1`,
      [eventId, error, status],
    );
  }

  releaseEventSavepoint(transaction: DatabaseTransaction) {
    return transaction.query("RELEASE SAVEPOINT apply_reputation_event");
  }

  advanceCheckpoint(
    transaction: DatabaseTransaction,
    aggregateId: string,
    revision: number,
  ) {
    return transaction.query(
      "UPDATE aggregate_checkpoints SET revision=$2 WHERE aggregate_id=$1",
      [aggregateId, revision],
    );
  }

  markEventApplied(transaction: DatabaseTransaction, eventId: string) {
    return transaction.query(
      "UPDATE inbox_events SET status='applied',applied_at=now(),error=NULL WHERE event_id=$1",
      [eventId],
    );
  }

  findNextRevision(transaction: DatabaseTransaction, aggregateId: string) {
    return transaction.query<{ expected: string; minimum: string | null }[]>(
      `SELECT coalesce((SELECT revision FROM aggregate_checkpoints WHERE aggregate_id=$1),0)+1 AS expected,min(revision) AS minimum
      FROM inbox_events WHERE aggregate_id=$1 AND status NOT IN ('applied','replay_held')`,
      [aggregateId],
    );
  }

  upsertGap(
    transaction: DatabaseTransaction,
    aggregateId: string,
    expectedRevision: string,
    throughRevision: number,
  ) {
    return transaction.query(
      `INSERT INTO recovery_gaps(aggregate_id,expected_revision,through_revision) VALUES($1,$2,$3)
          ON CONFLICT(aggregate_id) DO UPDATE SET expected_revision=$2,through_revision=$3,
          status=CASE WHEN recovery_gaps.expected_revision<>$2 OR recovery_gaps.status='resolved' THEN 'pending' ELSE recovery_gaps.status END,
          attempts=CASE WHEN recovery_gaps.expected_revision<>$2 OR recovery_gaps.status='resolved' THEN 0 ELSE recovery_gaps.attempts END,
          next_retry_at=CASE WHEN recovery_gaps.expected_revision<>$2 OR recovery_gaps.status='resolved' THEN now() ELSE recovery_gaps.next_retry_at END,
          last_error=CASE WHEN recovery_gaps.expected_revision<>$2 OR recovery_gaps.status='resolved' THEN NULL ELSE recovery_gaps.last_error END`,
      [aggregateId, expectedRevision, throughRevision],
    );
  }

  resolveGap(transaction: DatabaseTransaction, aggregateId: string) {
    return transaction.query(
      "UPDATE recovery_gaps SET status='resolved',last_error=NULL WHERE aggregate_id=$1 AND status<>'resolved'",
      [aggregateId],
    );
  }

  findReplayInboxEvents(
    transaction: DatabaseTransaction,
    items: Pick<ReplayItem, "event_id" | "aggregate_id" | "revision">[],
  ) {
    return transaction.query<
      {
        event_id: string;
        aggregate_id: string;
        revision: string;
        status: string;
        payload_hash: string;
      }[]
    >(
      `SELECT DISTINCT i.event_id,i.aggregate_id,i.revision,i.status,i.payload_hash
      FROM jsonb_to_recordset($1::jsonb) AS s(event_id uuid, aggregate_id uuid, revision bigint)
      JOIN inbox_events i ON i.event_id=s.event_id OR (i.aggregate_id=s.aggregate_id AND i.revision=s.revision)`,
      [JSON.stringify(items.map(({ event_id, aggregate_id, revision }) => ({ event_id, aggregate_id, revision })))],
    );
  }

  findLocalQuotaEvidence(transaction: DatabaseTransaction, buckets: ReplayQuotaBucket[]) {
    return transaction.query<ReplayQuotaEvidence[]>(
      `WITH buckets AS (
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS b("userId" text, day date, category text)
      )
      SELECT DISTINCT ON (r.value->>'key', b.day) i.event_id AS "eventId",
        i.aggregate_id AS "aggregateId", i.revision::text AS revision,
        r.value->>'key' AS "rewardKey", b."userId", r.value->>'actorId' AS "actorId",
        b.day::text AS day, b.category, coalesce(r.value->>'courseId','general') AS scope,
        i.payload->'data'->>'occurredAt' AS "occurredAt"
      FROM inbox_events i
      CROSS JOIN LATERAL jsonb_array_elements(i.payload->'data'->'rewards') r
      JOIN buckets b ON b."userId"=r.value->>'beneficiaryId'
        AND b.category=r.value->>'category'
        AND b.day=(((CASE WHEN b.category='upvote' THEN i.payload->'data'->>'occurredAt'
                        ELSE r.value->>'occurredAt' END)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
      WHERE i.status<>'applied' AND r.value->>'eligible'='true'
        AND (b.category='publication' OR r.value->>'actorId'<>b."userId")
      ORDER BY r.value->>'key',b.day,i.revision
      LIMIT 501`,
      [JSON.stringify(buckets)],
    );
  }

  findResolvedQuotaRewards(transaction: DatabaseTransaction, evidence: ReplayQuotaEvidence[]) {
    return transaction.query<{ rewardKey: string }[]>(
      `SELECT DISTINCT x."rewardKey"
      FROM jsonb_to_recordset($1::jsonb) AS x("eventId" uuid, "rewardKey" text)
      WHERE EXISTS(SELECT 1 FROM inbox_events i WHERE i.event_id=x."eventId" AND i.status='applied')
        OR EXISTS(SELECT 1 FROM reward_entitlements e WHERE e.reward_key=x."rewardKey" AND e.amount IS NOT NULL)
        OR EXISTS(SELECT 1 FROM reward_decisions d WHERE d.reward_key=x."rewardKey")`,
      [JSON.stringify(evidence.map(({ eventId, rewardKey }) => ({ eventId, rewardKey })))],
    );
  }

  findCheckpoints(transaction: DatabaseTransaction, aggregateIds: string[]) {
    return transaction.query<{ aggregate_id: string; revision: string }[]>(
      "SELECT aggregate_id,revision FROM aggregate_checkpoints WHERE aggregate_id=ANY($1::uuid[])",
      [aggregateIds],
    );
  }

  findReplayEntitlements(
    transaction: DatabaseTransaction,
    aggregateIds: string[],
  ) {
    return transaction.query<Entitlement[]>(
      "SELECT * FROM reward_entitlements WHERE aggregate_id=ANY($1::uuid[])",
      [aggregateIds],
    );
  }

  lockRulesForReplay(transaction: DatabaseTransaction) {
    return transaction.query(
      "SELECT pg_advisory_xact_lock_shared(hashtext('gamification-rules'))",
    );
  }

  findReplayPolicies(transaction: DatabaseTransaction, eventDates: string) {
    return transaction.query<{ id: string; config: Rules }[]>(
      `SELECT p.id,r.config FROM jsonb_to_recordset($1::jsonb) AS p(id uuid,occurred_at timestamptz)
      CROSS JOIN LATERAL (
        SELECT config FROM rule_sets ORDER BY (effective_at<=p.occurred_at) DESC,
          CASE WHEN effective_at<=p.occurred_at THEN version ELSE -version END DESC LIMIT 1
      ) r`,
      [eventDates],
    );
  }

  findMissingDecision(
    transaction: DatabaseTransaction,
    aggregateIds: string[],
  ) {
    return transaction.query<{ reward_key: string }[]>(
      `SELECT d.reward_key FROM reward_decisions d LEFT JOIN reward_entitlements e USING(reward_key)
      LEFT JOIN aggregate_checkpoints c ON c.aggregate_id=d.aggregate_id
      WHERE d.aggregate_id=ANY($1::uuid[]) AND (
        d.revision>coalesce(c.revision,0) OR
        d.amount IS DISTINCT FROM e.amount OR d.business_date IS DISTINCT FROM e.decision_business_date OR
        d.rule_version IS DISTINCT FROM e.rule_version OR d.scope IS DISTINCT FROM e.scope OR
        d.user_id IS DISTINCT FROM e.beneficiary_id OR d.actor_id IS DISTINCT FROM e.actor_id OR
        d.category IS DISTINCT FROM e.category OR
        (d.outcome='capped') IS DISTINCT FROM e.suppressed
      ) ORDER BY d.reward_key LIMIT 1`,
      [aggregateIds],
    );
  }

  findDailyBudgets(
    transaction: DatabaseTransaction,
    userIds: string[],
    days: string[],
  ) {
    return transaction.query<
      {
        user_id: string;
        day: string;
        category: string;
        gross_awarded: number;
      }[]
    >(
      "SELECT user_id,business_date::text AS day,category,gross_awarded FROM daily_budgets WHERE user_id=ANY($1::uuid[]) AND business_date=ANY($2::date[])",
      [userIds, days],
    );
  }

  findPairBudgets(
    transaction: DatabaseTransaction,
    userIds: string[],
    days: string[],
  ) {
    return transaction.query<
      { user_id: string; actor_id: string; day: string; awarded: number }[]
    >(
      "SELECT user_id,actor_id,business_date::text AS day,awarded FROM pair_budgets WHERE user_id=ANY($1::uuid[]) AND business_date=ANY($2::date[])",
      [userIds, days],
    );
  }

  insertReplayEvent(
    transaction: DatabaseTransaction,
    eventId: string,
    aggregateId: string,
    revision: string,
    payload: string,
    hash: string | null,
  ) {
    return transaction.query(
      `INSERT INTO inbox_events(event_id,aggregate_id,revision,payload,payload_hash,silent)
        VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(event_id) DO NOTHING`,
      [eventId, aggregateId, revision, payload, hash],
    );
  }

  upsertReplayCheckpoint(
    transaction: DatabaseTransaction,
    aggregateId: string,
    revision: string,
  ) {
    return transaction.query(
      `INSERT INTO aggregate_checkpoints(aggregate_id,revision) VALUES($1,$2)
        ON CONFLICT(aggregate_id) DO UPDATE SET revision=excluded.revision`,
      [aggregateId, revision],
    );
  }

  markHeldReferenceApplied(transaction: DatabaseTransaction, eventId: string) {
    return transaction.query(
      "UPDATE source_references SET status='applied',last_error=NULL WHERE event_id=$1 AND status='replay_held'",
      [eventId],
    );
  }
}
