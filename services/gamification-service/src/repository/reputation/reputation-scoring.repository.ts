import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "../../database/transaction-manager";
import type { Rules } from "../../service/rules/rules";
import type { Entitlement } from "./reputation-inbox.repository";

@Injectable()
export class ReputationScoringRepository {
  lockUser(transaction: DatabaseTransaction, userId: string) {
    return transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `reputation-user:${userId}`,
    ]);
  }

  findEntitlements(transaction: DatabaseTransaction, aggregateId: string) {
    return transaction.query<Entitlement[]>(
      "SELECT *,decision_business_date::text AS decision_business_date FROM reward_entitlements WHERE aggregate_id=$1 ORDER BY reward_key",
      [aggregateId],
    );
  }

  findPolicyAt(transaction: DatabaseTransaction, occurredAt: string) {
    return transaction.query<{ version: number; config: Rules }[]>(
      "SELECT version,config FROM rule_sets WHERE effective_at<=$1 ORDER BY version DESC LIMIT 1",
      [occurredAt],
    );
  }

  findInitialPolicy(transaction: DatabaseTransaction) {
    return transaction.query<{ version: number; config: Rules }[]>(
      "SELECT version,config FROM rule_sets ORDER BY version LIMIT 1",
    );
  }

  insertEntitlement(
    transaction: DatabaseTransaction,
    rewardKey: string,
    aggregateId: string,
    beneficiaryId: string,
    actorId: string,
    scope: string,
    category: string,
    occurredAt: string,
  ) {
    return transaction.query<Entitlement[]>(
      `INSERT INTO reward_entitlements(reward_key,aggregate_id,beneficiary_id,actor_id,scope,category,original_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        rewardKey,
        aggregateId,
        beneficiaryId,
        actorId,
        scope,
        category,
        occurredAt,
      ],
    );
  }

  ensureDailyBudget(
    transaction: DatabaseTransaction,
    userId: string,
    day: string,
    category: string,
  ) {
    return transaction.query(
      "INSERT INTO daily_budgets(user_id,business_date,category) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [userId, day, category],
    );
  }

  lockDailyBudget(
    transaction: DatabaseTransaction,
    userId: string,
    day: string,
    category: string,
  ) {
    return transaction.query<{ gross_awarded: number }[]>(
      "SELECT gross_awarded FROM daily_budgets WHERE user_id=$1 AND business_date=$2 AND category=$3 FOR UPDATE",
      [userId, day, category],
    );
  }

  ensurePairBudget(
    transaction: DatabaseTransaction,
    userId: string,
    actorId: string,
    day: string,
  ) {
    return transaction.query(
      "INSERT INTO pair_budgets(user_id,actor_id,business_date) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [userId, actorId, day],
    );
  }

  lockPairBudget(
    transaction: DatabaseTransaction,
    userId: string,
    actorId: string,
    day: string,
  ) {
    return transaction.query<{ awarded: number }[]>(
      "SELECT awarded FROM pair_budgets WHERE user_id=$1 AND actor_id=$2 AND business_date=$3 FOR UPDATE",
      [userId, actorId, day],
    );
  }

  updateEntitlementDecision(
    transaction: DatabaseTransaction,
    rewardKey: string,
    amount: number,
    ruleVersion: number,
    capped: boolean,
    day: string,
  ) {
    return transaction.query(
      "UPDATE reward_entitlements SET amount=$2,rule_version=$3,suppressed=$4,decision_business_date=$5 WHERE reward_key=$1",
      [rewardKey, amount, ruleVersion, capped, day],
    );
  }

  insertDecision(
    transaction: DatabaseTransaction,
    rewardKey: string,
    eventId: string,
    aggregateId: string,
    revision: number,
    userId: string,
    actorId: string,
    scope: string,
    category: string,
    day: string,
    ruleVersion: number,
    amount: number,
    outcome: string,
  ) {
    return transaction.query(
      `INSERT INTO reward_decisions(reward_key,event_id,aggregate_id,revision,user_id,actor_id,scope,category,business_date,rule_version,amount,outcome)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        rewardKey,
        eventId,
        aggregateId,
        revision,
        userId,
        actorId,
        scope,
        category,
        day,
        ruleVersion,
        amount,
        outcome,
      ],
    );
  }

  incrementDailyBudget(
    transaction: DatabaseTransaction,
    userId: string,
    day: string,
    category: string,
    amount: number,
  ) {
    return transaction.query(
      "UPDATE daily_budgets SET gross_awarded=gross_awarded+$4 WHERE user_id=$1 AND business_date=$2 AND category=$3",
      [userId, day, category, amount],
    );
  }

  incrementPairBudget(
    transaction: DatabaseTransaction,
    userId: string,
    actorId: string,
    day: string,
  ) {
    return transaction.query(
      "INSERT INTO pair_budgets(user_id,actor_id,business_date,awarded) VALUES($1,$2,$3,1) ON CONFLICT(user_id,actor_id,business_date) DO UPDATE SET awarded=pair_budgets.awarded+1",
      [userId, actorId, day],
    );
  }

  findLedgerEffects(transaction: DatabaseTransaction, eventId: string) {
    return transaction.query<
      { user_id: string; scopes: string[]; delta: string }[]
    >(
      "SELECT user_id,array_agg(DISTINCT scope) AS scopes,sum(delta) AS delta FROM reputation_ledger WHERE event_id=$1 GROUP BY user_id",
      [eventId],
    );
  }

  appendNotification(
    transaction: DatabaseTransaction,
    eventType: string,
    payload: string,
  ) {
    return transaction.query(
      "INSERT INTO gamification_outbox(event_type,payload) VALUES($1,$2)",
      [eventType, payload],
    );
  }

  appendLedgerEntry(
    transaction: DatabaseTransaction,
    rewardKey: string,
    eventId: string,
    userId: string,
    scope: string,
    delta: number,
    ruleVersion: number | null,
    day: string,
    reason: string,
  ) {
    return transaction.query<{ id: string }[]>(
      "INSERT INTO reputation_ledger(reward_key,event_id,user_id,scope,delta,rule_version,business_date,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id",
      [rewardKey, eventId, userId, scope, delta, ruleVersion, day, reason],
    );
  }

  setEntitlementActive(
    transaction: DatabaseTransaction,
    rewardKey: string,
    active: boolean,
  ) {
    return transaction.query(
      "UPDATE reward_entitlements SET active=$2,updated_at=now() WHERE reward_key=$1",
      [rewardKey, active],
    );
  }

  incrementUserScore(
    transaction: DatabaseTransaction,
    userId: string,
    delta: number,
    generalDelta: number,
  ) {
    return transaction.query(
      `INSERT INTO user_reputation(user_id,total_score,general_score) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET total_score=user_reputation.total_score+$2,general_score=user_reputation.general_score+$3,updated_at=now()`,
      [userId, delta, generalDelta],
    );
  }

  incrementCourseScore(
    transaction: DatabaseTransaction,
    userId: string,
    courseId: string,
    delta: number,
  ) {
    return transaction.query(
      "INSERT INTO user_course_reputation(user_id,course_id,score) VALUES($1,$2,$3) ON CONFLICT(user_id,course_id) DO UPDATE SET score=user_course_reputation.score+$3,updated_at=now()",
      [userId, courseId, delta],
    );
  }

  findLastBadgeEvaluation(
    transaction: DatabaseTransaction,
    userId: string,
    scope: string,
  ) {
    return transaction.query<{ rule_version: number }[]>(
      "SELECT rule_version FROM badge_evaluations WHERE user_id=$1 AND scope=$2",
      [userId, scope],
    );
  }

  findPolicyByVersion(transaction: DatabaseTransaction, version: number) {
    return transaction.query<{ version: number; config: Rules }[]>(
      "SELECT version,config FROM rule_sets WHERE version=$1",
      [version],
    );
  }

  findTotalScore(transaction: DatabaseTransaction, userId: string) {
    return transaction.query<{ score: string }[]>(
      "SELECT total_score AS score FROM user_reputation WHERE user_id=$1",
      [userId],
    );
  }

  findCourseScore(
    transaction: DatabaseTransaction,
    userId: string,
    courseId: string,
  ) {
    return transaction.query<{ score: string }[]>(
      "SELECT score FROM user_course_reputation WHERE user_id=$1 AND course_id=$2",
      [userId, courseId],
    );
  }

  upsertBadgeEvaluation(
    transaction: DatabaseTransaction,
    userId: string,
    scope: string,
    ruleVersion: number,
    score: string,
    eventId: string,
  ) {
    return transaction.query(
      "INSERT INTO badge_evaluations(user_id,scope,rule_version,score,event_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,scope) DO UPDATE SET rule_version=$3,score=$4,event_id=$5,evaluated_at=now()",
      [userId, scope, ruleVersion, score, eventId],
    );
  }

  findBadge(
    transaction: DatabaseTransaction,
    userId: string,
    scope: string,
    code: string,
  ) {
    return transaction.query<{ active: boolean }[]>(
      "SELECT active FROM user_badges WHERE user_id=$1 AND scope=$2 AND badge_code=$3",
      [userId, scope, code],
    );
  }

  upsertBadge(
    transaction: DatabaseTransaction,
    userId: string,
    scope: string,
    code: string,
    active: boolean,
    ruleVersion: number,
  ) {
    return transaction.query(
      "INSERT INTO user_badges(user_id,scope,badge_code,active,rule_version) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,scope,badge_code) DO UPDATE SET active=$4,rule_version=$5,revoked_at=CASE WHEN $4 THEN NULL WHEN user_badges.active THEN now() ELSE user_badges.revoked_at END",
      [userId, scope, code, active, ruleVersion],
    );
  }

  insertBadgeDecision(
    transaction: DatabaseTransaction,
    userId: string,
    scope: string,
    code: string,
    ruleVersion: number,
    threshold: number,
    score: string,
    active: boolean,
    eventId: string,
  ) {
    return transaction.query(
      "INSERT INTO badge_decisions(user_id,scope,badge_code,rule_version,threshold,score,active,event_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
      [userId, scope, code, ruleVersion, threshold, score, active, eventId],
    );
  }
}
