import { MigrationInterface, QueryRunner } from 'typeorm';

// Academic service replaced curricula with major_courses and kept the
// curriculum_courses ids, so stored references only need a column rename.
export class MajorCourseContext1791300000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    for (const table of ['discussions', 'room_academic_bindings']) {
      if (await q.hasColumn(table, 'curriculum_course_id'))
        await q.query(
          `ALTER TABLE ${table} RENAME COLUMN curriculum_course_id TO major_course_id`,
        );
      await q.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS major_course_id uuid, DROP COLUMN IF EXISTS curriculum_id`,
      );
    }
  }

  // Rollback restores the columns only; curriculum ids require a database backup.
  async down(q: QueryRunner): Promise<void> {
    for (const table of ['discussions', 'room_academic_bindings']) {
      await q.query(
        `ALTER TABLE ${table} RENAME COLUMN major_course_id TO curriculum_course_id`,
      );
      await q.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS curriculum_id uuid`,
      );
    }
  }
}
