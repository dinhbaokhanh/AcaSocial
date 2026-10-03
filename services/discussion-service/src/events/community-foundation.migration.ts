import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommunityFoundation1790201000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await q.query(`CREATE TABLE IF NOT EXISTS rooms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(100) NOT NULL UNIQUE,
      name varchar(200) NOT NULL, description text NOT NULL DEFAULT '', room_type varchar(20) NOT NULL,
      parent_room_id uuid REFERENCES rooms(id), visibility varchar(20) NOT NULL DEFAULT 'public',
      membership_policy varchar(20) NOT NULL DEFAULT 'open', posting_policy varchar(30) NOT NULL DEFAULT 'anyone',
      status varchar(20) NOT NULL DEFAULT 'active', created_by uuid NOT NULL, start_at timestamptz,
      end_at timestamptz, rules_version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`INSERT INTO rooms
      (id, slug, name, description, room_type, visibility, membership_policy, posting_policy, status, created_by)
      VALUES
      ('00000000-0000-4000-8000-000000000101', 'general', 'General',
       'Trao đổi chung trong cộng đồng AcaSocial.', 'forum', 'public', 'open', 'anyone', 'active',
       '00000000-0000-4000-8000-000000000001'),
      ('00000000-0000-4000-8000-000000000102', 'off-topic', 'Ngoài lề',
       'Các cuộc trò chuyện không thuộc phạm vi học thuật cụ thể.', 'forum', 'public', 'open', 'anyone', 'active',
       '00000000-0000-4000-8000-000000000001')
      ON CONFLICT (slug) DO NOTHING`);
    await q.query(`CREATE TABLE IF NOT EXISTS room_academic_bindings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
      major_id uuid NOT NULL, curriculum_id uuid, course_id uuid, curriculum_course_id uuid)`);
    await q.query(`CREATE TABLE IF NOT EXISTS room_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id uuid NOT NULL, role varchar(20) NOT NULL DEFAULT 'member', status varchar(20) NOT NULL DEFAULT 'active',
      assigned_by uuid, joined_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
      UNIQUE(room_id, user_id))`);
    await q.query('CREATE INDEX IF NOT EXISTS room_membership_user ON room_memberships(user_id, status)');
    await q.query(`CREATE TABLE IF NOT EXISTS room_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      rule_code varchar(40) NOT NULL, title varchar(160) NOT NULL, description text NOT NULL,
      severity varchar(20) NOT NULL DEFAULT 'medium', version integer NOT NULL DEFAULT 1,
      active boolean NOT NULL DEFAULT true, UNIQUE(room_id, rule_code, version))`);

    if (await q.hasTable('discussions')) {
      await q.query(`ALTER TABLE discussions
        ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id),
        ADD COLUMN IF NOT EXISTS major_id uuid,
        ADD COLUMN IF NOT EXISTS curriculum_id uuid,
        ADD COLUMN IF NOT EXISTS course_id uuid,
        ADD COLUMN IF NOT EXISTS curriculum_course_id uuid,
        ADD COLUMN IF NOT EXISTS accepted_answer_id uuid,
        ADD COLUMN IF NOT EXISTS answer_count integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS content_version integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS moderation_status varchar(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS visibility varchar(20) NOT NULL DEFAULT 'visible',
        ADD COLUMN IF NOT EXISTS ai_screening_status varchar(20) NOT NULL DEFAULT 'queued',
        ADD COLUMN IF NOT EXISTS ai_recommended_action varchar(20)`);
      await q.query('CREATE INDEX IF NOT EXISTS discussions_room_id ON discussions(room_id)');
      await q.query(`CREATE TABLE IF NOT EXISTS discussion_revisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        content_version integer NOT NULL, title varchar(300) NOT NULL, content text NOT NULL,
        revision_type varchar(20) NOT NULL DEFAULT 'semantic', edited_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(discussion_id, content_version))`);
      await q.query(`INSERT INTO discussion_revisions
        (discussion_id, content_version, title, content, revision_type, edited_by)
        SELECT id, content_version, title, content, 'semantic', author_id FROM discussions
        ON CONFLICT (discussion_id, content_version) DO NOTHING`);
      await q.query(`CREATE TABLE IF NOT EXISTS answers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        author_id uuid NOT NULL, content text NOT NULL, is_anonymous boolean NOT NULL DEFAULT false,
        content_version integer NOT NULL DEFAULT 1, moderation_status varchar(20) NOT NULL DEFAULT 'pending',
        visibility varchar(20) NOT NULL DEFAULT 'visible', verification_state varchar(30) NOT NULL DEFAULT 'unreviewed',
        knowledge_tier varchar(30) NOT NULL DEFAULT 'community', upvote_count integer NOT NULL DEFAULT 0,
        downvote_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
        ai_screening_status varchar(20) NOT NULL DEFAULT 'queued', ai_recommended_action varchar(20))`);
      await q.query('CREATE INDEX IF NOT EXISTS answers_discussion_created ON answers(discussion_id, created_at)');
      await q.query(`CREATE TABLE IF NOT EXISTS answer_revisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
        content_version integer NOT NULL, content text NOT NULL, revision_type varchar(20) NOT NULL,
        edited_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(answer_id, content_version))`);
      await q.query(`CREATE TABLE IF NOT EXISTS answer_acceptances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        answer_id uuid NOT NULL REFERENCES answers(id), question_version integer NOT NULL, answer_version integer NOT NULL,
        accepted_by uuid NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
        revoked_by uuid, revoke_reason varchar(100))`);
      await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS one_active_answer_acceptance
        ON answer_acceptances(discussion_id) WHERE revoked_at IS NULL`);
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
      if (await q.hasTable('tags'))
        await q.query(`CREATE TABLE IF NOT EXISTS discussion_tag_assignments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(), discussion_id uuid NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
          tag_id uuid REFERENCES tags(id), topic_id uuid, content_version integer NOT NULL, source varchar(20) NOT NULL,
          status varchar(20) NOT NULL, confidence real, model_version varchar(100), reviewed_by uuid,
          parent_assignment_id uuid REFERENCES discussion_tag_assignments(id),
          created_at timestamptz NOT NULL DEFAULT now())`);
    }
    await q.query(`CREATE TABLE IF NOT EXISTS ai_inference_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inference_id uuid NOT NULL UNIQUE,
      entity_type varchar(20) NOT NULL, entity_id uuid NOT NULL, content_version integer NOT NULL,
      model_version varchar(100) NOT NULL, policy_version varchar(100) NOT NULL, room_rules_version integer,
      recommended_action varchar(20) NOT NULL, category_scores jsonb NOT NULL DEFAULT '{}',
      raw_result jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query('CREATE INDEX IF NOT EXISTS ai_runs_content ON ai_inference_runs(entity_type, entity_id, content_version)');
    await q.query(`CREATE TABLE IF NOT EXISTS moderation_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type varchar(20) NOT NULL, entity_id uuid NOT NULL,
      content_version integer NOT NULL, decision varchar(20) NOT NULL, reason_codes jsonb NOT NULL DEFAULT '[]',
      note text NOT NULL DEFAULT '', reviewer_id uuid NOT NULL, related_ai_run_id uuid,
      created_at timestamptz NOT NULL DEFAULT now())`);
  }

  async down(q: QueryRunner) {
    for (const table of [
      'academic_disputes', 'answer_reviews', 'answer_acceptances', 'answer_revisions', 'answers',
      'moderation_reviews', 'ai_inference_runs', 'discussion_tag_assignments', 'discussion_revisions', 'room_rules', 'room_memberships',
      'room_academic_bindings', 'rooms',
    ]) await q.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    if (await q.hasTable('discussions'))
      await q.query(`ALTER TABLE discussions DROP COLUMN IF EXISTS room_id, DROP COLUMN IF EXISTS major_id,
        DROP COLUMN IF EXISTS curriculum_id, DROP COLUMN IF EXISTS course_id, DROP COLUMN IF EXISTS accepted_answer_id,
        DROP COLUMN IF EXISTS curriculum_course_id,
        DROP COLUMN IF EXISTS answer_count,
        DROP COLUMN IF EXISTS content_version, DROP COLUMN IF EXISTS moderation_status, DROP COLUMN IF EXISTS visibility,
        DROP COLUMN IF EXISTS ai_screening_status, DROP COLUMN IF EXISTS ai_recommended_action`);
  }
}
