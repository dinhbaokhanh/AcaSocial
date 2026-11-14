import { MigrationInterface, QueryRunner } from 'typeorm';
export class RoomLifecycle1791700000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS closure_at timestamptz`,
    );
    await q.query(`CREATE TABLE room_lifecycle_schedules (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
   close_at timestamptz NOT NULL, reason text NOT NULL, status varchar(20) NOT NULL DEFAULT 'pending', version integer NOT NULL DEFAULT 1,
   created_by uuid NOT NULL, updated_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
   CHECK(status IN ('pending','completed','cancelled')))`);
    await q.query(
      `CREATE UNIQUE INDEX room_one_pending_closure ON room_lifecycle_schedules(room_id) WHERE status = 'pending'`,
    );
    await q.query(
      `CREATE INDEX room_closure_due ON room_lifecycle_schedules(status, close_at)`,
    );
    await q.query(`CREATE TABLE room_notification_deliveries (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id uuid NOT NULL, schedule_version integer NOT NULL,
   event_type text NOT NULL, recipient_id uuid NOT NULL, room_id uuid NOT NULL, payload jsonb NOT NULL,
   delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
   UNIQUE(schedule_id,schedule_version,event_type,recipient_id))`);
    await q.query(
      `CREATE INDEX room_delivery_pending ON room_notification_deliveries(created_at) WHERE delivered_at IS NULL`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE room_notification_deliveries');
    await q.query('DROP TABLE room_lifecycle_schedules');
    await q.query('ALTER TABLE rooms DROP COLUMN closure_at');
  }
}
