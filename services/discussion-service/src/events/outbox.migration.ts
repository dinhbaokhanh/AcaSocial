import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiscussionOutbox1789090000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS discussion_outbox (
      id uuid PRIMARY KEY, event_type text NOT NULL, payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz,
      attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS discussion_outbox_pending ON discussion_outbox (next_attempt_at) WHERE delivered_at IS NULL',
    );
  }
  async down(queryRunner: QueryRunner) {
    await queryRunner.query('DROP TABLE discussion_outbox');
  }
}
