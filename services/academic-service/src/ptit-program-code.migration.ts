import { MigrationInterface, QueryRunner } from 'typeorm';

export class PtitProgramCodeNullable1791000000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE training_programs ALTER COLUMN program_code DROP NOT NULL`);
  }

  async down() {
    // Null codes are valid when PTIT does not publish a separate program code.
  }
}
