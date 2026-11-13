import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaResourceType1791600000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE IF EXISTS media_assets ADD COLUMN IF NOT EXISTS resource_type varchar(10)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE media_assets DROP COLUMN IF EXISTS resource_type');
  }
}
