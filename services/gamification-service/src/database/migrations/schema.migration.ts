import { MigrationInterface, QueryRunner } from "typeorm";

export const defaultRules = {
  upvotePoints: 10,
  acceptedPoints: 40,
  publicationPoints: 0,
  upvoteDailyCap: 200,
  publicationDailyCap: 2,
  pairDailyCap: 5,
  capEnabled: true,
  thresholds: [100, 300, 1000],
};

export class GamificationSchema1792000000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE rule_sets(version serial PRIMARY KEY, config jsonb NOT NULL, effective_at timestamptz NOT NULL DEFAULT now(), actor_id uuid, reason text NOT NULL);
      CREATE TABLE inbox_events(event_id uuid PRIMARY KEY, aggregate_id uuid NOT NULL, revision bigint NOT NULL CHECK(revision>0), payload jsonb NOT NULL, payload_hash text NOT NULL, status text NOT NULL DEFAULT 'pending', error text, received_at timestamptz NOT NULL DEFAULT now(), applied_at timestamptz, UNIQUE(aggregate_id,revision));
      CREATE INDEX gamification_pending ON inbox_events(aggregate_id,revision) WHERE status='pending';
      CREATE TABLE aggregate_checkpoints(aggregate_id uuid PRIMARY KEY, revision bigint NOT NULL DEFAULT 0);
      CREATE TABLE reward_entitlements(reward_key text PRIMARY KEY, aggregate_id uuid NOT NULL, beneficiary_id uuid NOT NULL, actor_id uuid NOT NULL, scope text NOT NULL, category text NOT NULL, original_at timestamptz NOT NULL, amount integer, rule_version integer REFERENCES rule_sets(version), active boolean NOT NULL DEFAULT false, suppressed boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX reward_aggregate ON reward_entitlements(aggregate_id);
      CREATE TABLE daily_budgets(user_id uuid NOT NULL, business_date date NOT NULL, category text NOT NULL, gross_awarded integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,business_date,category));
      CREATE TABLE pair_budgets(user_id uuid NOT NULL, actor_id uuid NOT NULL, business_date date NOT NULL, awarded integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,actor_id,business_date));
      CREATE TABLE reputation_ledger(id bigserial PRIMARY KEY, reward_key text NOT NULL REFERENCES reward_entitlements(reward_key), event_id uuid NOT NULL, user_id uuid NOT NULL, scope text NOT NULL, delta integer NOT NULL, rule_version integer NOT NULL, business_date date NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(reward_key,event_id));
      CREATE INDEX ledger_user ON reputation_ledger(user_id,id DESC);
      CREATE TABLE user_reputation(user_id uuid PRIMARY KEY, total_score bigint NOT NULL DEFAULT 0, general_score bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE user_course_reputation(user_id uuid NOT NULL, course_id uuid NOT NULL, score bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,course_id));
      CREATE TABLE user_badges(user_id uuid NOT NULL, scope text NOT NULL, badge_code text NOT NULL, active boolean NOT NULL, rule_version integer NOT NULL, earned_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, PRIMARY KEY(user_id,scope,badge_code));
      CREATE TABLE gamification_outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, payload jsonb NOT NULL, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX gamification_outbox_pending ON gamification_outbox(next_attempt_at) WHERE delivered_at IS NULL;
      CREATE TABLE configuration_audits(id bigserial PRIMARY KEY, actor_id uuid NOT NULL, reason text NOT NULL, before jsonb, after jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE reconciliation_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, status text NOT NULL DEFAULT 'pending', result jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);`);
    await q.query("INSERT INTO rule_sets(config,reason) VALUES($1,$2)", [
      JSON.stringify(defaultRules),
      "Initial rules",
    ]);
  }
  async down(q: QueryRunner) {
    await q.query(
      "DROP TABLE reconciliation_jobs,configuration_audits,gamification_outbox,user_badges,user_course_reputation,user_reputation,reputation_ledger,pair_budgets,daily_budgets,reward_entitlements,aggregate_checkpoints,inbox_events,rule_sets",
    );
  }
}
