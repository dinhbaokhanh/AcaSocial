import { MigrationInterface, QueryRunner } from "typeorm";

export class InboxRetry1792300000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE inbox_events
        ADD COLUMN attempts integer NOT NULL DEFAULT 0,
        ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
      CREATE INDEX gamification_inbox_due ON inbox_events(next_attempt_at,received_at)
        WHERE status='pending';
    `);
  }

  async down(): Promise<void> {
    throw new Error("Retain inbox retry and intervention state when rolling back");
  }
}
