import { MigrationInterface, QueryRunner } from "typeorm";

export class ScopedReplay1792500000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE source_references ADD COLUMN claim_token uuid;
      ALTER TABLE journal_replay_jobs ADD COLUMN scope jsonb NOT NULL DEFAULT '{}'::jsonb;
    `);
  }

  async down(): Promise<void> {
    throw new Error("Retain recorded replay scopes during application rollback");
  }
}
