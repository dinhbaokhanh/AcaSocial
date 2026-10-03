import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrustGovernance1790300000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`DO $$ BEGIN
      ALTER TYPE votes_target_type_enum ADD VALUE IF NOT EXISTS 'answer';
    EXCEPTION WHEN undefined_object THEN NULL;
    END $$`);
    if (await q.hasTable('discussions')) {
      await q.query(`ALTER TABLE discussions
        ADD COLUMN IF NOT EXISTS comments_locked boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS comments_locked_by uuid,
        ADD COLUMN IF NOT EXISTS comments_locked_at timestamptz,
        ADD COLUMN IF NOT EXISTS comments_lock_reason text`);
    }
    if (await q.hasTable('comments')) {
      await q.query(`ALTER TABLE comments
        ADD COLUMN IF NOT EXISTS moderation_status varchar(20) NOT NULL DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS visibility varchar(20) NOT NULL DEFAULT 'visible'`);
    }
    if (await q.hasTable('tags')) {
      await q.query(`ALTER TABLE tags
        ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS merged_into_tag_id uuid REFERENCES tags(id),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
    }
    await q.query(`CREATE TABLE IF NOT EXISTS moderation_cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type varchar(20) NOT NULL, entity_id uuid NOT NULL,
      content_version integer NOT NULL DEFAULT 1, status varchar(20) NOT NULL DEFAULT 'open',
      severity varchar(20) NOT NULL DEFAULT 'medium', report_count integer NOT NULL DEFAULT 1,
      assigned_to uuid, claimed_at timestamptz, resolved_at timestamptz,
      resolution_action varchar(30), resolution_note text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query('CREATE INDEX IF NOT EXISTS moderation_case_queue ON moderation_cases(status, created_at)');
    await q.query(`CREATE TABLE IF NOT EXISTS content_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type varchar(20) NOT NULL, entity_id uuid NOT NULL,
      reporter_id uuid NOT NULL, content_version integer NOT NULL DEFAULT 1, reason_code varchar(40) NOT NULL, details text NOT NULL DEFAULT '',
      status varchar(20) NOT NULL DEFAULT 'open', case_id uuid NOT NULL REFERENCES moderation_cases(id),
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entity_type, entity_id, reporter_id, content_version))`);
    await q.query(`CREATE TABLE IF NOT EXISTS moderation_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid REFERENCES moderation_cases(id),
      entity_type varchar(20) NOT NULL, entity_id uuid NOT NULL, action varchar(40) NOT NULL,
      actor_id uuid NOT NULL, note text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query('CREATE INDEX IF NOT EXISTS moderation_audit_case ON moderation_audit_logs(case_id, created_at)');
  }
  async down(q: QueryRunner) {
    await q.query('DROP TABLE IF EXISTS moderation_audit_logs, content_reports, moderation_cases CASCADE');
    await q.query('ALTER TABLE IF EXISTS comments DROP COLUMN IF EXISTS moderation_status, DROP COLUMN IF EXISTS visibility');
    await q.query('ALTER TABLE IF EXISTS discussions DROP COLUMN IF EXISTS comments_locked, DROP COLUMN IF EXISTS comments_locked_by, DROP COLUMN IF EXISTS comments_locked_at, DROP COLUMN IF EXISTS comments_lock_reason');
    await q.query('ALTER TABLE IF EXISTS tags DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS merged_into_tag_id, DROP COLUMN IF EXISTS updated_at');
  }
}
