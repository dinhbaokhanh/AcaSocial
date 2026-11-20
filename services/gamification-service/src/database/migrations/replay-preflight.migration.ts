import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplayPreflight1792400000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE reward_decisions(
        reward_key text PRIMARY KEY, event_id uuid NOT NULL, aggregate_id uuid NOT NULL,
        revision bigint NOT NULL, user_id uuid NOT NULL, actor_id uuid NOT NULL, scope text NOT NULL,
        category text NOT NULL, business_date date NOT NULL, rule_version integer NOT NULL REFERENCES rule_sets(version),
        amount integer NOT NULL, outcome text NOT NULL CHECK(outcome IN ('granted','capped','zero')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX reward_decisions_aggregate ON reward_decisions(aggregate_id);
      ALTER TABLE journal_replay_jobs
        ADD COLUMN findings jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN staged_bytes bigint NOT NULL DEFAULT 0,
        ADD COLUMN preflight_complete boolean NOT NULL DEFAULT false;
      ALTER TABLE journal_replay_jobs ALTER COLUMN status SET DEFAULT 'previewing';
      ALTER TABLE journal_replay_items
        ADD COLUMN aggregate_id uuid, ADD COLUMN revision bigint,
        ADD COLUMN payload jsonb, ADD COLUMN payload_hash text;
      CREATE UNIQUE INDEX replay_item_revision ON journal_replay_items(job_id,aggregate_id,revision);

      UPDATE source_references r SET status='replay_held'
        WHERE r.silent AND r.status<>'applied';
      UPDATE inbox_events e SET status='replay_held'
        WHERE e.silent AND e.status<>'applied';
      UPDATE journal_replay_jobs SET status='needs_intervention',cursor=0,
        last_error='Replay requires a new preflight before scoring'
        WHERE status IN ('preview_ready','applying','queued','needs_intervention');
    `);
  }

  async down(): Promise<void> {
    throw new Error("Retain replay staging and original reward decisions during rollback");
  }
}
