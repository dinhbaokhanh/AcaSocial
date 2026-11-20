import { MigrationInterface, QueryRunner } from 'typeorm';

/** Deferred snapshots cover all mutation paths, including legacy acceptance and moderation. */
export class ReputationEvents1792000000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE reputation_source_config (id boolean PRIMARY KEY DEFAULT true CHECK(id), started_at timestamptz NOT NULL DEFAULT clock_timestamp());
      INSERT INTO reputation_source_config(id) VALUES(true);
      CREATE TABLE reputation_aggregates (discussion_id uuid PRIMARY KEY, revision bigint NOT NULL DEFAULT 0);
      CREATE TABLE reputation_emissions (transaction_id bigint NOT NULL, discussion_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(transaction_id,discussion_id));
      CREATE INDEX reputation_emissions_created ON reputation_emissions(created_at);
      CREATE TABLE reputation_legacy_acceptances (discussion_id uuid NOT NULL, comment_id uuid NOT NULL, first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(discussion_id,comment_id));
      INSERT INTO reputation_legacy_acceptances(discussion_id,comment_id,first_seen_at) SELECT id,accepted_comment_id,created_at FROM discussions WHERE accepted_comment_id IS NOT NULL;`);
    await q.query(`CREATE FUNCTION reputation_snapshot(pid uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE p discussions%ROWTYPE; rewards jsonb; started timestamptz; allowed boolean;
      BEGIN
        SELECT * INTO p FROM discussions WHERE id=pid;
        SELECT started_at INTO started FROM reputation_source_config WHERE id=true;
        IF p.id IS NULL THEN RETURN jsonb_build_object('aggregateId',pid,'rewards','[]'::jsonb); END IF;
        allowed := p.deleted_at IS NULL AND p.moderation_status='approved' AND p.visibility='visible' AND p.pending_revision IS NULL;
        IF p.accepted_comment_id IS NOT NULL THEN
          INSERT INTO reputation_legacy_acceptances(discussion_id,comment_id) VALUES(pid,p.accepted_comment_id) ON CONFLICT DO NOTHING;
        END IF;
        SELECT coalesce(jsonb_agg(item ORDER BY item->>'key'),'[]'::jsonb) INTO rewards FROM (
          SELECT jsonb_build_object('key','vote:'||v.user_id||':'||v.target_type||':'||v.target_id,'category','upvote',
            'beneficiaryId',CASE WHEN v.target_type='discussion' THEN p.author_id ELSE a.author_id END,
            'actorId',v.user_id,'courseId',p.course_id,'occurredAt',v.created_at,
            'eligible',allowed AND v.vote_type='upvote' AND v.user_id<>CASE WHEN v.target_type='discussion' THEN p.author_id ELSE a.author_id END
              AND (v.target_type='discussion' OR (a.deleted_at IS NULL AND a.moderation_status='approved' AND a.visibility='visible'))) AS item
          FROM votes v LEFT JOIN answers a ON v.target_type='answer' AND a.id=v.target_id
          WHERE v.created_at>=started AND ((v.target_type='discussion' AND v.target_id=pid) OR (v.target_type='answer' AND a.discussion_id=pid))
          UNION ALL
          SELECT jsonb_build_object('key','accepted:'||pid||':answer:'||a.id,'category','accepted','beneficiaryId',a.author_id,'actorId',p.author_id,'courseId',p.course_id,
            'occurredAt',min(h.accepted_at),'eligible',allowed AND a.deleted_at IS NULL AND a.moderation_status='approved' AND a.visibility='visible' AND a.author_id<>p.author_id)
          FROM answers a JOIN answer_acceptances h ON h.answer_id=a.id AND h.discussion_id=pid
          WHERE p.accepted_answer_id=a.id AND h.revoked_at IS NULL AND h.accepted_at>=started GROUP BY a.id
          UNION ALL
          SELECT jsonb_build_object('key','accepted:'||pid||':comment:'||c.id,'category','accepted','beneficiaryId',c.author_id,'actorId',p.author_id,'courseId',p.course_id,
            'occurredAt',h.first_seen_at,'eligible',allowed AND c.deleted_at IS NULL AND c.author_id<>p.author_id)
          FROM comments c JOIN reputation_legacy_acceptances h ON h.discussion_id=pid AND h.comment_id=c.id
          WHERE p.accepted_answer_id IS NULL AND p.accepted_comment_id=c.id AND h.first_seen_at>=started
          UNION ALL
          SELECT jsonb_build_object('key','publication:'||pid,'category','publication','beneficiaryId',p.author_id,'actorId',p.author_id,'courseId',p.course_id,'occurredAt',p.created_at,'eligible',allowed)
          WHERE p.created_at>=started
        ) r;
        RETURN jsonb_build_object('schemaVersion',1,'aggregateId',pid,'courseId',p.course_id,'rewards',rewards);
      END $$;`);
    await q.query(`CREATE FUNCTION emit_reputation_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE rowdata jsonb; olddata jsonb; pid uuid; claimed uuid; rev bigint; payload jsonb;
      BEGIN
        IF TG_OP='DELETE' THEN rowdata:=to_jsonb(OLD); ELSE rowdata:=to_jsonb(NEW); END IF;
        IF TG_OP='UPDATE' THEN
          olddata:=to_jsonb(OLD);
          IF (rowdata-'view_count'-'upvote_count'-'downvote_count'-'comment_count'-'answer_count'-'updated_at'-'ai_screening_status'-'ai_recommended_action')
            = (olddata-'view_count'-'upvote_count'-'downvote_count'-'comment_count'-'answer_count'-'updated_at'-'ai_screening_status'-'ai_recommended_action') THEN RETURN NULL; END IF;
        END IF;
        IF TG_TABLE_NAME='discussions' THEN pid:=(rowdata->>'id')::uuid;
        ELSIF TG_TABLE_NAME='votes' THEN
          IF rowdata->>'target_type'='discussion' THEN pid:=(rowdata->>'target_id')::uuid;
          ELSIF rowdata->>'target_type'='answer' THEN SELECT discussion_id INTO pid FROM answers WHERE id=(rowdata->>'target_id')::uuid;
          ELSE RETURN NULL; END IF;
        ELSE pid:=(rowdata->>'discussion_id')::uuid; END IF;
        IF pid IS NULL THEN RETURN NULL; END IF;
        INSERT INTO reputation_emissions(transaction_id,discussion_id) VALUES(txid_current(),pid) ON CONFLICT DO NOTHING RETURNING discussion_id INTO claimed;
        IF claimed IS NULL THEN RETURN NULL; END IF;
        INSERT INTO reputation_aggregates(discussion_id,revision) VALUES(pid,1) ON CONFLICT(discussion_id) DO UPDATE SET revision=reputation_aggregates.revision+1 RETURNING revision INTO rev;
        payload:=reputation_snapshot(pid)||jsonb_build_object('reputationRevision',rev,'occurredAt',clock_timestamp());
        INSERT INTO discussion_outbox(id,event_type,payload) VALUES(gen_random_uuid(),'reputation.content.changed',payload);
        RETURN NULL;
      END $$;`);
    for (const table of ['discussions', 'votes', 'answers', 'comments', 'answer_acceptances']) {
      await q.query(`CREATE CONSTRAINT TRIGGER reputation_${table} AFTER INSERT OR UPDATE OR DELETE ON ${table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION emit_reputation_snapshot()`);
    }
  }
  async down(q: QueryRunner) {
    for (const table of ['discussions', 'votes', 'answers', 'comments', 'answer_acceptances']) await q.query(`DROP TRIGGER IF EXISTS reputation_${table} ON ${table}`);
    await q.query('DROP FUNCTION emit_reputation_snapshot(); DROP FUNCTION reputation_snapshot(uuid); DROP TABLE reputation_emissions,reputation_aggregates,reputation_legacy_acceptances,reputation_source_config');
  }
}
