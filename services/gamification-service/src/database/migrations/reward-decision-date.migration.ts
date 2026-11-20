import { MigrationInterface, QueryRunner } from "typeorm";

export class RewardDecisionDate1792200000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      "ALTER TABLE reward_entitlements ADD COLUMN decision_business_date date",
    );
  }

  async down(): Promise<void> {
    throw new Error("Retain recorded quota dates when rolling back the application");
  }
}
