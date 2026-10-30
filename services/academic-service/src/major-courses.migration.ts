import { MigrationInterface, QueryRunner } from 'typeorm';

export class MajorCourses1791100000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS major_courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      major_id uuid NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
      course_id uuid NOT NULL REFERENCES courses(id), course_type varchar(20) NOT NULL,
      recommended_semester integer, display_order integer NOT NULL DEFAULT 0, credits integer,
      provenance varchar(20) NOT NULL DEFAULT 'SIMULATED', UNIQUE(major_id, course_id))`);
    // Keep curriculum_courses ids so discussion-service references still resolve.
    // A course listed in several curricula of one major keeps the active/newest row.
    if (await q.hasTable('curriculum_courses'))
      await q.query(`INSERT INTO major_courses
          (id, major_id, course_id, course_type, recommended_semester, display_order, credits, provenance)
        SELECT DISTINCT ON (c.major_id, cc.course_id)
          cc.id, c.major_id, cc.course_id, cc.course_type, cc.recommended_semester, cc.display_order,
          cc.credits, cc.provenance
        FROM curriculum_courses cc JOIN curricula c ON c.id = cc.curriculum_id
        ORDER BY c.major_id, cc.course_id, (c.status = 'active') DESC, c.effective_year DESC, c.created_at DESC
        ON CONFLICT DO NOTHING`);
    await q.query(`DROP TABLE IF EXISTS curriculum_courses`);
    await q.query(`DROP TABLE IF EXISTS curricula`);
  }

  // Rollback restores the schema only; curriculum versions require a database backup.
  async down(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS curricula (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), major_id uuid NOT NULL REFERENCES majors(id),
      training_program_id uuid REFERENCES training_programs(id), version varchar(40) NOT NULL,
      effective_year integer NOT NULL, status varchar(20) NOT NULL DEFAULT 'draft',
      provenance varchar(20) NOT NULL DEFAULT 'SIMULATED', source_url varchar(500),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS curricula_legacy_major_version
      ON curricula(major_id, version) WHERE training_program_id IS NULL`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS curricula_program_version
      ON curricula(training_program_id, version) WHERE training_program_id IS NOT NULL`);
    await q.query(`CREATE TABLE IF NOT EXISTS curriculum_courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), curriculum_id uuid NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
      course_id uuid NOT NULL REFERENCES courses(id), course_type varchar(20) NOT NULL,
      recommended_semester integer, display_order integer NOT NULL DEFAULT 0, credits integer,
      provenance varchar(20) NOT NULL DEFAULT 'SIMULATED', UNIQUE(curriculum_id, course_id))`);
    await q.query(`DROP TABLE IF EXISTS major_courses`);
  }
}
