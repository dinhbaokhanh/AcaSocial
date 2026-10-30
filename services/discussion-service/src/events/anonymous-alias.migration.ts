import { MigrationInterface, QueryRunner } from 'typeorm';

// Số thứ tự người ẩn danh theo bài, dùng làm hậu tố nickname (1–99) không trùng trong một bài.
export class AnonymousAlias1791500000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS anonymous_aliases (
      discussion_id uuid NOT NULL,
      author_id uuid NOT NULL,
      seq int NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT anonymous_aliases_pkey PRIMARY KEY (discussion_id, author_id),
      CONSTRAINT anonymous_aliases_discussion_seq UNIQUE (discussion_id, seq)
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS anonymous_aliases`);
  }
}
