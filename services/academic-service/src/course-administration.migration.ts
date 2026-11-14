import { MigrationInterface, QueryRunner } from "typeorm";
export class CourseAdministration1791600000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS metadata_version integer NOT NULL DEFAULT 1`,
    );
    await q.query(
      `CREATE TABLE IF NOT EXISTS catalog_audits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_id uuid NOT NULL, actor_id uuid NOT NULL, action varchar(40) NOT NULL, before jsonb, after jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS catalog_audits_entity ON catalog_audits(entity_id, created_at)`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("DROP TABLE IF EXISTS catalog_audits");
    await q.query("ALTER TABLE courses DROP COLUMN IF EXISTS metadata_version");
  }
}
