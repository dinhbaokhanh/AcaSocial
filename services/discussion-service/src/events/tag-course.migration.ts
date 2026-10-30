import { MigrationInterface, QueryRunner } from 'typeorm';

// Tag thuộc môn nào (courses.id bên academic-service) để ưu tiên tag của môn khi soạn bài trong room môn.
export class TagCourse1791400000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE tags ADD COLUMN IF NOT EXISTS course_id uuid`);
    await q.query(`CREATE INDEX IF NOT EXISTS tags_course_id ON tags(course_id)`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS tags_course_id`);
    await q.query(`ALTER TABLE tags DROP COLUMN IF EXISTS course_id`);
  }
}
