import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProvenance1790910000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    if (!(await q.hasTable('discussions'))) return;
    await q.query(`ALTER TABLE discussions ADD COLUMN IF NOT EXISTS content_provenance varchar(20)`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE discussions DROP COLUMN IF EXISTS content_provenance`);
  }
}
