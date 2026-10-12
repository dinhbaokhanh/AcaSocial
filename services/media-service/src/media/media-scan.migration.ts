import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaScan1791200000001 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE IF EXISTS media_assets ADD COLUMN IF NOT EXISTS scan_status varchar(20) NOT NULL DEFAULT 'unverified', ADD COLUMN IF NOT EXISTS scanned_at timestamptz`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE media_assets DROP COLUMN IF EXISTS scan_status, DROP COLUMN IF EXISTS scanned_at',
    );
  }
}
