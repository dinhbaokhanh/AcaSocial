import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAcademicVerification1790800000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query('DROP TABLE IF EXISTS academic_disputes, answer_reviews');
    await q.query(`ALTER TABLE IF EXISTS answers
      DROP COLUMN IF EXISTS verification_state,
      DROP COLUMN IF EXISTS knowledge_tier`);
  }

  // Rollback restores the schema only; removed data requires a database backup.
  async down(q: QueryRunner) {
    if (!(await q.hasTable('answers'))) return;
    await q.query(`ALTER TABLE answers
      ADD COLUMN IF NOT EXISTS verification_state varchar(30) NOT NULL DEFAULT 'unreviewed',
      ADD COLUMN IF NOT EXISTS knowledge_tier varchar(30) NOT NULL DEFAULT 'community'`);
    await q.query(`CREATE TABLE IF NOT EXISTS answer_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
      answer_version integer NOT NULL, question_version integer NOT NULL, reviewer_id uuid NOT NULL,
      reviewer_assignment_id uuid, decision varchar(30) NOT NULL, correctness smallint NOT NULL,
      relevance smallint NOT NULL, completeness smallint NOT NULL, reasoning_quality smallint NOT NULL,
      citation_quality smallint NOT NULL, reason_codes jsonb NOT NULL DEFAULT '[]',
      note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(answer_id, answer_version, reviewer_id))`);
    await q.query(`CREATE TABLE IF NOT EXISTS academic_disputes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
      answer_version integer NOT NULL, raised_by uuid NOT NULL, category varchar(50) NOT NULL,
      explanation text NOT NULL, status varchar(20) NOT NULL DEFAULT 'open', resolved_by uuid,
      resolution text, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(answer_id, answer_version, raised_by))`);
  }
}
