import { MigrationInterface, QueryRunner } from 'typeorm';

export class PtitCatalog1790900000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS academic_sources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), url varchar(500) NOT NULL UNIQUE,
      title varchar(240) NOT NULL, publisher varchar(120) NOT NULL DEFAULT 'PTIT',
      accessed_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS universities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(40) NOT NULL UNIQUE,
      name varchar(240) NOT NULL, website varchar(500), provenance varchar(20) NOT NULL DEFAULT 'OFFICIAL',
      source_url varchar(500), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`ALTER TABLE majors ADD COLUMN IF NOT EXISTS university_id uuid REFERENCES universities(id)`);
    await q.query(`ALTER TABLE majors ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'SIMULATED'`);
    await q.query(`ALTER TABLE majors ADD COLUMN IF NOT EXISTS source_url varchar(500)`);
    await q.query(`CREATE TABLE IF NOT EXISTS training_programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), major_id uuid NOT NULL REFERENCES majors(id),
      program_code varchar(60) NOT NULL, name varchar(240) NOT NULL, program_type varchar(40) NOT NULL DEFAULT 'standard',
      admission_code varchar(60), provenance varchar(20) NOT NULL DEFAULT 'OFFICIAL', source_url varchar(500),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(major_id, program_code))`);
    await q.query(`ALTER TABLE courses ALTER COLUMN code DROP NOT NULL`);
    await q.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS official_code varchar(60)`);
    await q.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'SIMULATED'`);
    await q.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS source_url varchar(500)`);
    await q.query(`ALTER TABLE curricula ADD COLUMN IF NOT EXISTS training_program_id uuid REFERENCES training_programs(id)`);
    await q.query(`ALTER TABLE curricula ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'SIMULATED'`);
    await q.query(`ALTER TABLE curricula ADD COLUMN IF NOT EXISTS source_url varchar(500)`);
    const constraints: Array<{ conname: string }> = await q.query(`
      SELECT c.conname FROM pg_constraint c
      WHERE c.conrelid = 'curricula'::regclass AND c.contype = 'u'
        AND (SELECT array_agg(a.attname ORDER BY a.attname)
             FROM unnest(c.conkey) k(attnum) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum)
            = ARRAY['major_id','version']::name[]`);
    for (const { conname } of constraints) await q.query(`ALTER TABLE curricula DROP CONSTRAINT "${conname}"`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS curricula_legacy_major_version
      ON curricula(major_id, version) WHERE training_program_id IS NULL`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS curricula_program_version
      ON curricula(training_program_id, version) WHERE training_program_id IS NOT NULL`);
    await q.query(`ALTER TABLE curriculum_courses ADD COLUMN IF NOT EXISTS credits integer`);
    await q.query(`ALTER TABLE curriculum_courses ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'SIMULATED'`);
    await q.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS keywords jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await q.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'SIMULATED'`);
    await q.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS source_url varchar(500)`);
    await q.query(`ALTER TABLE course_topics ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'SIMULATED'`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE course_topics DROP COLUMN IF EXISTS provenance`);
    await q.query(`ALTER TABLE topics DROP COLUMN IF EXISTS source_url, DROP COLUMN IF EXISTS provenance, DROP COLUMN IF EXISTS keywords`);
    await q.query(`ALTER TABLE curriculum_courses DROP COLUMN IF EXISTS provenance, DROP COLUMN IF EXISTS credits`);
    await q.query(`ALTER TABLE curricula DROP COLUMN IF EXISTS source_url, DROP COLUMN IF EXISTS provenance, DROP COLUMN IF EXISTS training_program_id`);
    await q.query(`ALTER TABLE curricula DROP CONSTRAINT IF EXISTS UQ_curricula_major_version`);
    await q.query(`DROP INDEX IF EXISTS curricula_legacy_major_version, DROP INDEX IF EXISTS curricula_program_version`);
    await q.query(`ALTER TABLE courses DROP COLUMN IF EXISTS source_url, DROP COLUMN IF EXISTS provenance, DROP COLUMN IF EXISTS official_code`);
    await q.query(`ALTER TABLE courses ALTER COLUMN code SET NOT NULL`);
    await q.query(`DROP TABLE IF EXISTS training_programs, universities, academic_sources CASCADE`);
    await q.query(`ALTER TABLE majors DROP COLUMN IF EXISTS university_id, DROP COLUMN IF EXISTS source_url, DROP COLUMN IF EXISTS provenance`);
  }
}
