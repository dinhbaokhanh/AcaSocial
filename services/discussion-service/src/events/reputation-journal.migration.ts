import { MigrationInterface, QueryRunner } from 'typeorm';
import { ReputationEvents1792000000000 } from './reputation-events.migration';

/** Immutable historical snapshots are independent of outbox delivery/cleanup. */
export class ReputationJournal1792100000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE reputation_journal(event_id uuid PRIMARY KEY, aggregate_id uuid NOT NULL, revision bigint NOT NULL, payload_text text NOT NULL, payload_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(aggregate_id,revision));
      CREATE INDEX reputation_journal_created ON reputation_journal(created_at);
      CREATE TABLE reputation_exports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),manifests jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE FUNCTION reputation_journal_manifest(e reputation_journal) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
        SELECT jsonb_build_object('schemaVersion',2,'aggregateId',e.aggregate_id,'reputationRevision',e.revision,
          'payloadHash',e.payload_hash,'payloadBytes',octet_length(e.payload_text),'payloadCharacters',char_length(e.payload_text))
      $$;
      INSERT INTO reputation_journal(event_id,aggregate_id,revision,payload_text,payload_hash,created_at)
        SELECT id,(payload->>'aggregateId')::uuid,(payload->>'reputationRevision')::bigint,payload::text,encode(digest(payload::text,'sha256'),'hex'),created_at
        FROM discussion_outbox WHERE event_type='reputation.content.changed' AND payload->>'schemaVersion'='1'
        ON CONFLICT DO NOTHING;`);
    // Reuse the original function definitions, without replaying their table/trigger DDL.
    const definitions: string[] = [];
    await new ReputationEvents1792000000000().up({
      query: async (sql: string) => {
        if (sql.startsWith('CREATE FUNCTION')) definitions.push(sql);
        return [];
      },
    } as unknown as QueryRunner);
    for (let sql of definitions) {
      sql = sql.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');
      sql = sql.replace(
        "jsonb_build_object('aggregateId',pid,'rewards'",
        "jsonb_build_object('schemaVersion',1,'aggregateId',pid,'rewards'",
      );
      sql = sql.replace(
        'rev bigint; payload jsonb;',
        'rev bigint; payload jsonb; eid uuid; j reputation_journal%ROWTYPE;',
      );
      sql = sql.replace(
        "INSERT INTO discussion_outbox(id,event_type,payload) VALUES(gen_random_uuid(),'reputation.content.changed',payload);",
        `eid:=gen_random_uuid();
        INSERT INTO reputation_journal(event_id,aggregate_id,revision,payload_text,payload_hash)
          VALUES(eid,pid,rev,payload::text,encode(digest(payload::text,'sha256'),'hex')) RETURNING * INTO j;
        INSERT INTO discussion_outbox(id,event_type,payload) VALUES(eid,'reputation.content.changed',reputation_journal_manifest(j));`,
      );
      await q.query(sql);
    }
    // Pending V1 events are switched to references too; their original identities stay unchanged.
    await q.query(`UPDATE discussion_outbox o SET payload=reputation_journal_manifest(j)
      FROM reputation_journal j WHERE o.id=j.event_id AND o.delivered_at IS NULL`);
  }
  async down(): Promise<void> {
    throw new Error(
      'Journal rollback requires draining V2 references first; retain history and roll back application instead',
    );
  }
}
