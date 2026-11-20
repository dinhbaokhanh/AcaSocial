import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiCases1791800000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE ai_moderation_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES moderation_cases(id),
      content_version integer NOT NULL, policy_version varchar(100) NOT NULL DEFAULT 'v1',
      title varchar(300) NOT NULL, content text NOT NULL,
      state varchar(20) NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
      available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
      result jsonb, error_code varchar(100), created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(case_id, content_version, policy_version))`);
    await q.query('CREATE INDEX ai_jobs_pending ON ai_moderation_jobs(state, available_at)');
  }
  async down(q: QueryRunner) { await q.query('DROP TABLE ai_moderation_jobs'); }
}
