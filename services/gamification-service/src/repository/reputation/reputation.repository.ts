import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type ReputationActivity = "ledger" | "courses" | "badges";

const activityQueries = {
  ledger: {
    table: "reputation_ledger",
    columns: "id,scope,delta,reason,rule_version,business_date,created_at",
    order: "id DESC",
  },
  courses: {
    table: "user_course_reputation",
    columns: "course_id,score,updated_at",
    order: "score DESC,course_id",
  },
  badges: {
    table: "user_badges",
    columns: "scope,badge_code,active,rule_version,earned_at,revoked_at",
    order: "earned_at DESC,scope,badge_code",
  },
};

@Injectable()
export class ReputationRepository {
  constructor(private readonly db: DataSource) {}

  findSummary(userId: string) {
    return this.db.query<
      { total_score: string; general_score: string; updated_at: string }[]
    >("SELECT * FROM user_reputation WHERE user_id=$1", [userId]);
  }

  findStartDate() {
    return this.db.query<{ effective_at: string }[]>(
      "SELECT effective_at FROM rule_sets ORDER BY version LIMIT 1",
    );
  }

  countPendingForUser(userId: string) {
    return this.db.query<{ count: string }[]>(
      `SELECT count(*) FROM inbox_events i WHERE i.status='pending' AND (
        i.payload->'data'->'rewards' @> jsonb_build_array(jsonb_build_object('beneficiaryId',$1::text))
        OR EXISTS (
          SELECT 1 FROM reward_entitlements e
          WHERE e.aggregate_id=i.aggregate_id AND e.beneficiary_id=$1::uuid AND e.active
            AND NOT (i.payload->'data'->'rewards' @> jsonb_build_array(jsonb_build_object('key',e.reward_key,'eligible',true)))
        )
      )`,
      [userId],
    );
  }

  listActivity(
    kind: ReputationActivity,
    userId: string,
    limit: number,
    offset: number,
  ) {
    const { columns, table, order } = activityQueries[kind];
    return this.db.query(
      `SELECT ${columns} FROM ${table} WHERE user_id=$1 ORDER BY ${order} LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
  }

  countActivity(kind: ReputationActivity, userId: string) {
    const { table } = activityQueries[kind];
    return this.db.query<{ count: string }[]>(
      `SELECT count(*) FROM ${table} WHERE user_id=$1`,
      [userId],
    );
  }
}
