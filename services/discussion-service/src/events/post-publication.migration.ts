import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostPublication1791000000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    // Release posts held for initial review, preserving moderator-hidden content.
    await q.query(`UPDATE discussions SET visibility = 'visible'
      WHERE moderation_status = 'pending' AND visibility = 'held'`);
  }

  async down(): Promise<void> {
    // Publication cannot be safely reversed without hiding already public posts.
  }
}
