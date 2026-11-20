import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { DatabaseTransaction } from "../../database/transaction-manager";
import type { Rules } from "../../service/rules/rules";

@Injectable()
export class RulesRepository {
  constructor(private readonly db: DataSource) {}

  findCurrent() {
    return this.db.query<
      { version: number; config: Rules; effective_at: string }[]
    >(
      "SELECT version,config,effective_at FROM rule_sets ORDER BY version DESC LIMIT 1",
    );
  }

  lockRuleChanges(transaction: DatabaseTransaction) {
    return transaction.query(
      "SELECT pg_advisory_xact_lock(hashtext('gamification-rules'))",
    );
  }

  lockCurrent(transaction: DatabaseTransaction) {
    return transaction.query<{ version: number; config: Rules }[]>(
      "SELECT version,config FROM rule_sets ORDER BY version DESC LIMIT 1 FOR UPDATE",
    );
  }

  insertRules(
    transaction: DatabaseTransaction,
    config: string,
    actorId: string,
    reason: string,
  ) {
    return transaction.query(
      "INSERT INTO rule_sets(config,actor_id,reason) VALUES($1,$2,$3) RETURNING version,config,effective_at",
      [config, actorId, reason],
    );
  }

  appendAudit(
    transaction: DatabaseTransaction,
    actorId: string,
    reason: string,
    before: string,
    after: string,
  ) {
    return transaction.query(
      "INSERT INTO configuration_audits(actor_id,reason,before,after) VALUES($1,$2,$3,$4)",
      [actorId, reason, before, after],
    );
  }

  listAudits(limit: number, offset: number) {
    return this.db.query(
      "SELECT id,actor_id,reason,before,after,created_at FROM configuration_audits ORDER BY id DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
  }
}
