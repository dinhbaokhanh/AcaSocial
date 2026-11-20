import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { DatabaseTransaction } from "../../database/transaction-manager";

function badgeHistory(userParameter: "$1" | "$2") {
  return `SELECT d.user_id,d.scope,d.badge_code,d.active,d.rule_version,earned.created_at AS earned_at,
    CASE WHEN d.active THEN NULL ELSE revoked.created_at END AS revoked_at
    FROM (
      SELECT DISTINCT ON (user_id,scope,badge_code) * FROM badge_decisions
      WHERE (${userParameter}::uuid IS NULL OR user_id=${userParameter})
      ORDER BY user_id,scope,badge_code,id DESC
    ) d
    JOIN LATERAL (
      SELECT h.created_at FROM badge_decisions h
      WHERE h.user_id=d.user_id AND h.scope=d.scope AND h.badge_code=d.badge_code
      ORDER BY h.active DESC,h.id LIMIT 1
    ) earned ON true
    LEFT JOIN LATERAL (
      SELECT h.id FROM badge_decisions h
      WHERE h.user_id=d.user_id AND h.scope=d.scope AND h.badge_code=d.badge_code AND h.active
      ORDER BY h.id DESC LIMIT 1
    ) last_active ON NOT d.active
    LEFT JOIN LATERAL (
      SELECT h.created_at FROM badge_decisions h
      WHERE h.user_id=d.user_id AND h.scope=d.scope AND h.badge_code=d.badge_code
        AND h.id>last_active.id AND NOT h.active
      ORDER BY h.id LIMIT 1
    ) revoked ON true`;
}

@Injectable()
export class ReconciliationRepository {
  constructor(private readonly db: DataSource) {}

  insertPreview(actorId: string) {
    return this.db.query(
      "INSERT INTO reconciliation_jobs(actor_id) VALUES($1) RETURNING *",
      [actorId],
    );
  }

  listJobs(limit: number, offset: number) {
    return this.db.query(
      "SELECT * FROM reconciliation_jobs ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
  }

  listFindings(jobId: string, limit: number, offset: number) {
    return this.db.query(
      "SELECT id,kind,subject,expected,actual FROM reconciliation_findings WHERE job_id=$1 ORDER BY id LIMIT $2 OFFSET $3",
      [jobId, limit, offset],
    );
  }

  lockRebuildRequest(transaction: DatabaseTransaction, idempotencyKey: string) {
    return transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `rebuild:${idempotencyKey}`,
    ]);
  }

  findRebuild(transaction: DatabaseTransaction, idempotencyKey: string) {
    return transaction.query<
      {
        user_id: string;
        actor_id: string;
        reason: string;
        preview_job_id: string;
      }[]
    >("SELECT * FROM reconciliation_jobs WHERE idempotency_key=$1", [
      idempotencyKey,
    ]);
  }

  findEligiblePreview(
    transaction: DatabaseTransaction,
    previewJobId: string,
    userId: string,
  ) {
    return transaction.query(
      "SELECT id FROM reconciliation_jobs WHERE id=$1 AND kind='preview' AND status='completed' AND completed_at>now()-interval '1 day' AND (user_id IS NULL OR user_id=$2)",
      [previewJobId, userId],
    );
  }

  insertRebuild(
    transaction: DatabaseTransaction,
    actorId: string,
    userId: string,
    reason: string,
    idempotencyKey: string,
    previewJobId: string,
  ) {
    return transaction.query(
      "INSERT INTO reconciliation_jobs(actor_id,kind,user_id,reason,idempotency_key,preview_job_id) VALUES($1,'rebuild',$2,$3,$4,$5) RETURNING *",
      [actorId, userId, reason, idempotencyKey, previewJobId],
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

  lockNextJob(transaction: DatabaseTransaction) {
    return transaction.query<
      {
        id: string;
        kind: string;
        user_id: string | null;
        actor_id: string;
        reason: string;
      }[]
    >(
      "SELECT * FROM reconciliation_jobs WHERE status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
    );
  }

  lockUser(transaction: DatabaseTransaction, userId: string) {
    return transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `reputation-user:${userId}`,
    ]);
  }

  rebuildUserScore(transaction: DatabaseTransaction, userId: string) {
    return transaction.query(
      `INSERT INTO user_reputation(user_id,total_score,general_score)
          SELECT $1::uuid,coalesce(sum(delta),0),coalesce(sum(delta) FILTER(WHERE scope='general'),0) FROM reputation_ledger WHERE user_id=$1
          ON CONFLICT(user_id) DO UPDATE SET total_score=excluded.total_score,general_score=excluded.general_score,updated_at=now()`,
      [userId],
    );
  }

  clearCourseScores(transaction: DatabaseTransaction, userId: string) {
    return transaction.query(
      "DELETE FROM user_course_reputation WHERE user_id=$1",
      [userId],
    );
  }

  rebuildCourseScores(transaction: DatabaseTransaction, userId: string) {
    return transaction.query(
      "INSERT INTO user_course_reputation(user_id,course_id,score) SELECT user_id,scope::uuid,sum(delta) FROM reputation_ledger WHERE user_id=$1 AND scope<>'general' GROUP BY user_id,scope",
      [userId],
    );
  }

  clearBadgesWithoutDecisions(
    transaction: DatabaseTransaction,
    userId: string,
  ) {
    return transaction.query(
      "DELETE FROM user_badges b WHERE user_id=$1 AND NOT EXISTS(SELECT 1 FROM badge_decisions d WHERE d.user_id=b.user_id AND d.scope=b.scope AND d.badge_code=b.badge_code)",
      [userId],
    );
  }

  rebuildBadges(transaction: DatabaseTransaction, userId: string) {
    return transaction.query(
      `INSERT INTO user_badges(user_id,scope,badge_code,active,rule_version,earned_at,revoked_at)
          ${badgeHistory("$1")}
          ON CONFLICT(user_id,scope,badge_code) DO UPDATE SET active=excluded.active,rule_version=excluded.rule_version,
            earned_at=excluded.earned_at,
            revoked_at=CASE WHEN excluded.active THEN NULL ELSE coalesce(excluded.revoked_at,user_badges.revoked_at) END`,
      [userId],
    );
  }

  insertFindings(
    transaction: DatabaseTransaction,
    jobId: string,
    userId: string | null,
  ) {
    return transaction.query(
      `INSERT INTO reconciliation_findings(job_id,kind,subject,expected,actual)
        SELECT $1::uuid,'total',coalesce(l.user_id,t.user_id)::text,coalesce(l.score,0)::text,coalesce(t.total_score,0)::text
        FROM (SELECT user_id,sum(delta) score FROM reputation_ledger GROUP BY user_id) l FULL JOIN user_reputation t ON t.user_id=l.user_id
        WHERE coalesce(l.score,0)<>coalesce(t.total_score,0) AND ($2::uuid IS NULL OR coalesce(l.user_id,t.user_id)=$2)
        UNION ALL
        SELECT $1::uuid,'general',coalesce(l.user_id,t.user_id)::text,coalesce(l.score,0)::text,coalesce(t.general_score,0)::text
        FROM (SELECT user_id,sum(delta) score FROM reputation_ledger WHERE scope='general' GROUP BY user_id) l FULL JOIN user_reputation t ON t.user_id=l.user_id
        WHERE coalesce(l.score,0)<>coalesce(t.general_score,0) AND ($2::uuid IS NULL OR coalesce(l.user_id,t.user_id)=$2)
        UNION ALL
        SELECT $1::uuid,'course',coalesce(l.user_id,t.user_id)::text||':'||coalesce(l.scope,t.course_id::text),coalesce(l.score,0)::text,coalesce(t.score,0)::text
        FROM (SELECT user_id,scope,sum(delta) score FROM reputation_ledger WHERE scope<>'general' GROUP BY user_id,scope) l FULL JOIN user_course_reputation t ON t.user_id=l.user_id AND t.course_id::text=l.scope
        WHERE coalesce(l.score,0)<>coalesce(t.score,0) AND ($2::uuid IS NULL OR coalesce(l.user_id,t.user_id)=$2)
        UNION ALL
        SELECT $1::uuid,'scope_sum',t.user_id::text,t.total_score::text,(t.general_score+coalesce(c.score,0))::text
        FROM user_reputation t LEFT JOIN (SELECT user_id,sum(score) score FROM user_course_reputation GROUP BY user_id) c ON c.user_id=t.user_id
        WHERE t.total_score<>t.general_score+coalesce(c.score,0) AND ($2::uuid IS NULL OR t.user_id=$2)
        UNION ALL
        SELECT $1::uuid,'entitlement',e.reward_key,(CASE WHEN e.active THEN coalesce(e.amount,0) ELSE 0 END)::text,coalesce(l.score,0)::text
        FROM reward_entitlements e LEFT JOIN (SELECT reward_key,sum(delta) score FROM reputation_ledger GROUP BY reward_key) l ON l.reward_key=e.reward_key
        WHERE (CASE WHEN e.active THEN coalesce(e.amount,0) ELSE 0 END)<>coalesce(l.score,0) AND ($2::uuid IS NULL OR e.beneficiary_id=$2)
        UNION ALL
        SELECT $1::uuid,'badge',coalesce(d.user_id,b.user_id)::text||':'||coalesce(d.scope,b.scope)||':'||coalesce(d.badge_code,b.badge_code),
          CASE WHEN d.user_id IS NULL THEN 'no decision' ELSE jsonb_build_object(
            'active',d.active,'ruleVersion',d.rule_version,'earnedAt',d.earned_at,'revokedAt',d.revoked_at)::text END,
          CASE WHEN b.user_id IS NULL THEN 'missing' ELSE jsonb_build_object(
            'active',b.active,'ruleVersion',b.rule_version,'earnedAt',b.earned_at,'revokedAt',b.revoked_at)::text END
        FROM (${badgeHistory("$2")}) d
        FULL JOIN user_badges b ON b.user_id=d.user_id AND b.scope=d.scope AND b.badge_code=d.badge_code
        WHERE (d.active IS DISTINCT FROM b.active OR d.rule_version IS DISTINCT FROM b.rule_version
          OR d.earned_at IS DISTINCT FROM b.earned_at
          OR ((d.active OR d.revoked_at IS NOT NULL) AND d.revoked_at IS DISTINCT FROM b.revoked_at))
          AND ($2::uuid IS NULL OR coalesce(d.user_id,b.user_id)=$2)
        UNION ALL
        SELECT $1::uuid,'daily_budget',coalesce(e.user_id,b.user_id)::text||':'||coalesce(e.business_date,b.business_date)::text||':'||coalesce(e.category,b.category),coalesce(e.gross,0)::text,coalesce(b.gross_awarded,0)::text
        FROM (SELECT beneficiary_id user_id,coalesce(decision_business_date,(original_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) business_date,category,
          sum(CASE WHEN category='publication' THEN 1 ELSE amount END) gross FROM reward_entitlements
          WHERE amount>0 AND NOT suppressed GROUP BY beneficiary_id,business_date,category) e
        FULL JOIN daily_budgets b ON b.user_id=e.user_id AND b.business_date=e.business_date AND b.category=e.category
        WHERE coalesce(e.gross,0)<>coalesce(b.gross_awarded,0) AND ($2::uuid IS NULL OR coalesce(e.user_id,b.user_id)=$2)
        UNION ALL
        SELECT $1::uuid,'pair_budget',coalesce(e.user_id,b.user_id)::text||':'||coalesce(e.actor_id,b.actor_id)::text||':'||coalesce(e.business_date,b.business_date)::text,coalesce(e.gross,0)::text,coalesce(b.awarded,0)::text
        FROM (SELECT beneficiary_id user_id,actor_id,coalesce(decision_business_date,(original_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) business_date,count(*) gross
          FROM reward_entitlements WHERE category='upvote' AND amount>0 AND NOT suppressed GROUP BY beneficiary_id,actor_id,business_date) e
        FULL JOIN pair_budgets b ON b.user_id=e.user_id AND b.actor_id=e.actor_id AND b.business_date=e.business_date
        WHERE coalesce(e.gross,0)<>coalesce(b.awarded,0) AND ($2::uuid IS NULL OR coalesce(e.user_id,b.user_id)=$2)`,
      [jobId, userId],
    );
  }

  countFindings(transaction: DatabaseTransaction, jobId: string) {
    return transaction.query<{ kind: string; count: string }[]>(
      "SELECT kind,count(*) FROM reconciliation_findings WHERE job_id=$1 GROUP BY kind",
      [jobId],
    );
  }

  countPendingEvents(transaction: DatabaseTransaction) {
    return transaction.query<{ pending: string }[]>(
      "SELECT count(*) AS pending FROM inbox_events WHERE status='pending'",
    );
  }

  completeJob(transaction: DatabaseTransaction, jobId: string, result: string) {
    return transaction.query(
      "UPDATE reconciliation_jobs SET status='completed',result=$2,completed_at=now() WHERE id=$1",
      [jobId, result],
    );
  }
}
