import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomPostPolicy1791200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS review_policy varchar(20) NOT NULL DEFAULT 'direct', ADD COLUMN IF NOT EXISTS policy_locked boolean NOT NULL DEFAULT false`,
    );
    await q.query(
      `ALTER TABLE room_memberships ADD COLUMN IF NOT EXISTS post_permission varchar(20) NOT NULL DEFAULT 'inherit'`,
    );
    await q.query(
      `ALTER TABLE discussions ADD COLUMN IF NOT EXISTS pending_revision jsonb, ADD COLUMN IF NOT EXISTS moderation_note text NOT NULL DEFAULT ''`,
    );
    await q.query(
      `CREATE TABLE IF NOT EXISTS room_policy_audits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES rooms(id), actor_id uuid NOT NULL, member_id uuid, before jsonb NOT NULL, after jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS room_policy_audits');
    await q.query(
      'ALTER TABLE discussions DROP COLUMN IF EXISTS pending_revision, DROP COLUMN IF EXISTS moderation_note',
    );
    await q.query(
      'ALTER TABLE room_memberships DROP COLUMN IF EXISTS post_permission',
    );
    await q.query(
      'ALTER TABLE rooms DROP COLUMN IF EXISTS review_policy, DROP COLUMN IF EXISTS policy_locked',
    );
  }
}
