import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveStaffAssignments1790800000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query('DROP TABLE IF EXISTS academic_staff_assignments');
  }

  // Rollback restores the schema only; removed data requires a database backup.
  async down(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS academic_staff_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, scope_type varchar(20) NOT NULL,
      scope_id uuid NOT NULL, role varchar(30) NOT NULL, valid_from timestamptz NOT NULL DEFAULT now(),
      valid_until timestamptz, status varchar(20) NOT NULL DEFAULT 'active', assigned_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX IF NOT EXISTS academic_staff_scope
      ON academic_staff_assignments(user_id, scope_type, scope_id)`);
  }
}
