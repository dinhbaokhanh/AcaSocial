import { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademicFoundation1790200000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await q.query(`CREATE TABLE IF NOT EXISTS majors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(40) NOT NULL UNIQUE,
      name varchar(200) NOT NULL, description text NOT NULL DEFAULT '',
      status varchar(20) NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(40) NOT NULL UNIQUE,
      name varchar(200) NOT NULL, description text NOT NULL DEFAULT '',
      status varchar(20) NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS curricula (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), major_id uuid NOT NULL REFERENCES majors(id),
      version varchar(40) NOT NULL, effective_year integer NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(major_id, version))`);
    await q.query(`CREATE TABLE IF NOT EXISTS curriculum_courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), curriculum_id uuid NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
      course_id uuid NOT NULL REFERENCES courses(id), course_type varchar(20) NOT NULL,
      recommended_semester integer, display_order integer NOT NULL DEFAULT 0,
      UNIQUE(curriculum_id, course_id))`);
    await q.query(`CREATE TABLE IF NOT EXISTS topics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) NOT NULL UNIQUE,
      name varchar(160) NOT NULL, description text NOT NULL DEFAULT '', parent_topic_id uuid REFERENCES topics(id),
      taxonomy_version integer NOT NULL DEFAULT 1, status varchar(20) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS course_topics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE, relevance_weight real NOT NULL DEFAULT 1,
      UNIQUE(course_id, topic_id))`);
    await q.query(`CREATE TABLE IF NOT EXISTS academic_staff_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, scope_type varchar(20) NOT NULL,
      scope_id uuid NOT NULL, role varchar(30) NOT NULL, valid_from timestamptz NOT NULL DEFAULT now(),
      valid_until timestamptz, status varchar(20) NOT NULL DEFAULT 'active', assigned_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX IF NOT EXISTS academic_staff_scope
      ON academic_staff_assignments(user_id, scope_type, scope_id)`);
  }

  async down(q: QueryRunner) {
    for (const table of [
      'academic_staff_assignments', 'course_topics', 'topics', 'curriculum_courses',
      'curricula', 'courses', 'majors',
    ]) await q.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
}
