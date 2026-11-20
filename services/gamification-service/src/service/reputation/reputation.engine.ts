import { createHash } from "crypto";
import { type DatabaseTransaction, TransactionManager } from "../../database/transaction-manager";
import { type Entitlement, ReputationInboxRepository } from "../../repository/reputation/reputation-inbox.repository";
import { ReputationScoringRepository } from "../../repository/reputation/reputation-scoring.repository";
import { uuid } from "../uuid";
import type { Rules } from "../rules/rules";
import {
  canUseQuota,
  dailyKey,
  pairKey,
  quotaFindings,
  type ReplayCandidate,
  type ReplayFinding,
  type ReplayItem,
  type ReplayQuotaBucket,
  type ReplayQuotaEvidence,
} from "./replay-preflight";

export interface Reward {
  key: string;
  category: "upvote" | "accepted" | "publication";
  beneficiaryId: string;
  actorId: string;
  courseId: string | null;
  occurredAt: string;
  eligible: boolean;
}
export interface ReputationEvent {
  eventId: string;
  eventType: string;
  data: {
    schemaVersion: number;
    aggregateId: string;
    reputationRevision: number;
    occurredAt: string;
    rewards: Reward[];
  };
}
export function validateEvent(
  input: unknown,
): asserts input is ReputationEvent {
  const e = input as ReputationEvent;
  if (
    !e ||
    !uuid.test(e.eventId) ||
    e.eventType !== "reputation.content.changed" ||
    e.data?.schemaVersion !== 1 ||
    !uuid.test(e.data.aggregateId) ||
    !Number.isSafeInteger(e.data.reputationRevision) ||
    e.data.reputationRevision < 1 ||
    !Number.isFinite(Date.parse(e.data.occurredAt)) ||
    !Array.isArray(e.data.rewards)
  )
    throw new Error("Invalid reputation event");
  const keys = new Set<string>();
  for (const r of e.data.rewards) {
    if (
      !r ||
      typeof r.key !== "string" ||
      r.key.length > 250 ||
      keys.has(r.key) ||
      !uuid.test(r.beneficiaryId) ||
      !uuid.test(r.actorId) ||
      (r.courseId !== null && !uuid.test(r.courseId)) ||
      !["upvote", "accepted", "publication"].includes(r.category) ||
      typeof r.eligible !== "boolean" ||
      !Number.isFinite(Date.parse(r.occurredAt))
    )
      throw new Error("Invalid reward snapshot");
    keys.add(r.key);
  }
}
export function businessDate(at: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

class InvalidRewardTransition extends Error {}
const MAX_INBOX_ATTEMPTS = 8;
const MAX_REPLAY_LOCKS = 1000;

export const eventHash = (event: ReputationEvent) =>
  createHash("sha256").update(JSON.stringify(event.data)).digest("hex");

const rewardEligible = (reward: Reward) =>
  reward.eligible &&
  (reward.category === "publication" || reward.beneficiaryId !== reward.actorId);

const pointsFor = (category: Reward["category"], rules: Rules) =>
  category === "upvote" ? rules.upvotePoints
    : category === "accepted" ? rules.acceptedPoints : rules.publicationPoints;

/** Serializable effects are protected by ordered user advisory locks and aggregate checkpoints. */
export class ReputationEngine {
  constructor(
    private readonly inbox: ReputationInboxRepository,
    private readonly scoring: ReputationScoringRepository,
    private readonly transactions: TransactionManager,
    private readonly notify = true,
  ) {}
  async receive(event: unknown, silent = false) {
    validateEvent(event);
    const hash = eventHash(event);
    await this.transactions.run(async (m) => {
      await this.inbox.lockAggregate(m, event.data.aggregateId);
      const existing = await this.inbox.findExistingEvent(
        m,
        event.eventId,
        event.data.aggregateId,
        event.data.reputationRevision,
      );
      if (existing.length) {
        if (
          existing[0].event_id !== event.eventId ||
          existing[0].payload_hash !== hash
        )
          throw new Error("Conflicting event identity");
        return;
      }
      await this.inbox.insertEvent(
        m,
        event.eventId,
        event.data.aggregateId,
        event.data.reputationRevision,
        JSON.stringify(event),
        hash,
        silent,
      );
    });
    await this.drain(event.data.aggregateId);
  }
  async drain(aggregateId: string) {
    for (let i = 0; i < 50; i++) {
      const applied = await this.transactions.run(async (m) => {
        await this.inbox.lockAggregate(m, aggregateId);
        await this.inbox.ensureCheckpoint(m, aggregateId);
        const [checkpoint] = await this.inbox.lockCheckpoint(m, aggregateId);
        const [row] = await this.inbox.lockPendingEvent(m, aggregateId, Number(checkpoint.revision) + 1);
        if (!row) return false;
        await this.inbox.savepointForEvent(m);
        try {
          await this.apply(m, row.payload, this.notify && !row.silent);
        } catch (error) {
          await this.inbox.rollbackEvent(m);
          const needsIntervention =
            error instanceof InvalidRewardTransition ||
            row.attempts + 1 >= MAX_INBOX_ATTEMPTS;
          await this.inbox.recordEventFailure(
            m,
            row.event_id,
            String(error).slice(0, 1000),
            needsIntervention ? "needs_intervention" : "pending",
          );
          return false;
        }
        await this.inbox.releaseEventSavepoint(m);
        await this.inbox.advanceCheckpoint(m, aggregateId, row.payload.data.reputationRevision);
        await this.inbox.markEventApplied(m, row.event_id);
        return true;
      });
      if (!applied) break;
    }
    await this.detectGap(aggregateId);
  }
  async detectGap(aggregateId: string) {
    await this.transactions.run(async (m) => {
      await this.inbox.lockAggregate(m, aggregateId);
      await this.updateGap(m, aggregateId);
    });
  }

  private async updateGap(m: DatabaseTransaction, aggregateId: string) {
    const [row] = await this.inbox.findNextRevision(m, aggregateId);
    if (row.minimum !== null && Number(row.minimum) > Number(row.expected)) {
      await this.inbox.upsertGap(m, aggregateId, row.expected, Number(row.minimum) - 1);
    } else {
      await this.inbox.resolveGap(m, aggregateId);
    }
  }

  async replay(
    m: DatabaseTransaction,
    items: ReplayItem[],
    execute: boolean,
    sourceQuotaEvidence?: (buckets: ReplayQuotaBucket[]) => Promise<ReplayQuotaEvidence[]>,
  ): Promise<ReplayFinding[]> {
    const aggregates = [...new Set(items.filter((i) => i.payload).map((i) => i.aggregate_id))].sort();
    if (aggregates.length > MAX_REPLAY_LOCKS)
      return [{ kind: "state", message: "Replay affects too many discussions for an atomic run. Use recovery for individual discussions." }];
    if (execute)
      for (const id of aggregates) await this.inbox.lockAggregate(m, id);

    const inbox = await this.inbox.findReplayInboxEvents(m, items);
    const eventsById = new Map(inbox.map((e) => [e.event_id, e]));
    const eventsByRevision = new Map(inbox.map((e) => [`${e.aggregate_id}:${e.revision}`, e.event_id]));
    const checkpoints = await this.inbox.findCheckpoints(m, aggregates);
    const checkpointRevisions = new Map(checkpoints.map((c) => [c.aggregate_id, BigInt(c.revision)]));
    const nextByDiscussion = new Map(checkpoints.map((c) => [c.aggregate_id, BigInt(c.revision) + 1n]));
    const pending: { item: ReplayItem; event: ReputationEvent }[] = [];
    const gaps: ReplayFinding[] = [];
    for (const item of items) {
      const existing = eventsById.get(item.event_id);
      const revisionEventId = eventsByRevision.get(`${item.aggregate_id}:${item.revision}`);
      if (revisionEventId && revisionEventId !== item.event_id)
        return [{ kind: "state", message: `Conflicting event identity for discussion ${item.aggregate_id} revision ${item.revision}` }];
      if (existing && (
        existing.aggregate_id !== item.aggregate_id || existing.revision !== item.revision ||
        (item.payload_hash !== null && existing.payload_hash !== item.payload_hash)
      )) return [{ kind: "state", message: `Conflicting event identity ${item.event_id}` }];
      if (existing?.status === "applied") {
        if (aggregates.includes(item.aggregate_id) &&
            BigInt(item.revision) > (checkpointRevisions.get(item.aggregate_id) ?? 0n))
          return [{ kind: "state", message: `Applied event is ahead of the checkpoint for discussion ${item.aggregate_id}` }];
        continue;
      }
      if (!item.payload || !item.payload_hash)
        return [{ kind: "state", message: `Preview payload is missing for event ${item.event_id}` }];
      const expected = nextByDiscussion.get(item.aggregate_id) ?? 1n;
      const revision = BigInt(item.revision);
      if (revision < expected)
        return [{ kind: "state", message: `Checkpoint is already past unapplied revision ${item.revision} of discussion ${item.aggregate_id}` }];
      if (revision > expected && gaps.length < 20)
        gaps.push({
          kind: "missing_revision",
          message: `Revision ${expected} is missing for discussion ${item.aggregate_id}`,
          revisions: [{ aggregateId: item.aggregate_id, revision: String(expected) }],
        });
      if (revision > expected && gaps.length === 20) break;
      nextByDiscussion.set(item.aggregate_id, revision + 1n);
      pending.push({ item, event: item.payload });
    }
    if (gaps.length || !pending.length) return gaps;

    const currentEntitlements = await this.inbox.findReplayEntitlements(m, aggregates);
    const entitlements = new Map(currentEntitlements.map((e) => [e.reward_key, e]));
    const users = [...new Set([
      ...currentEntitlements.map((e) => e.beneficiary_id),
      ...pending.flatMap(({ event }) => event.data.rewards.map((r) => r.beneficiaryId)),
    ])].sort();
    if (users.length > MAX_REPLAY_LOCKS)
      return [{ kind: "state", message: "Replay affects too many users for an atomic run. Use recovery for individual discussions." }];
    if (execute) await this.lockUsers(m, users);
    if (execute)
      await this.inbox.lockRulesForReplay(m);

    const policies = await this.inbox.findReplayPolicies(
      m,
      JSON.stringify(pending.map(({ event }) => ({ id: event.eventId, occurred_at: event.data.occurredAt }))),
    );
    const rulesByEvent = new Map(policies.map((p) => [p.id, p.config]));
    const candidates: ReplayCandidate[] = [];
    const unresolved = new Set<string>();
    const firstSeen = new Map<string, Reward>();
    for (const { item, event } of pending) {
      const rules = rulesByEvent.get(event.eventId)!;
      for (const reward of event.data.rewards) {
        if (!firstSeen.has(reward.key)) firstSeen.set(reward.key, reward);
        if (!rewardEligible(reward) || unresolved.has(reward.key)) continue;
        const current = entitlements.get(reward.key);
        if (current && current.amount !== null) continue;
        unresolved.add(reward.key);
        const points = pointsFor(reward.category, rules);
        if (!points || reward.category === "accepted") continue;
        const original = firstSeen.get(reward.key)!;
        candidates.push({
          userId: reward.beneficiaryId, actorId: current?.actor_id ?? original.actorId,
          category: reward.category, points, rules,
          day: businessDate(reward.category === "upvote" ? event.data.occurredAt : current?.original_at ?? original.occurredAt),
          scope: current?.scope ?? original.courseId ?? "general",
          revision: { aggregateId: item.aggregate_id, revision: item.revision },
        });
      }
    }
    const [lostDecision] = await this.inbox.findMissingDecision(m, aggregates);
    if (lostDecision)
      return [{ kind: "state", message: `Recorded reward decision ${lostDecision.reward_key} disagrees with the scoring state. Restore the original state before replay.` }];
    if (candidates.length) {
      const days = [...new Set(candidates.map((c) => c.day))];
      const daily = new Map((await this.inbox.findDailyBudgets(m, users, days))
        .map((b) => [dailyKey(b.user_id, b.day, b.category), b.gross_awarded]));
      const pairs = new Map((await this.inbox.findPairBudgets(m, users, days))
        .map((b) => [pairKey(b.user_id, b.actor_id, b.day), b.awarded]));
      const findings = quotaFindings(candidates, daily, pairs);
      if (findings.length) return findings;
      const selected = candidates.filter((candidate) => canUseQuota(candidate, daily, pairs));
      if (sourceQuotaEvidence && selected.length) {
        const outside = await this.outsideQuotaCandidates(m, selected, unresolved, sourceQuotaEvidence);
        const shared = quotaFindings([...selected, ...outside], daily, pairs, new Set(selected));
        if (shared.length) return shared;
      }
    }
    if (!execute) return [];

    for (const { item, event } of pending) {
      await this.inbox.insertReplayEvent(
        m,
        item.event_id,
        item.aggregate_id,
        item.revision,
        JSON.stringify(event),
        item.payload_hash,
      );
      await this.apply(m, event, false);
      await this.inbox.upsertReplayCheckpoint(m, item.aggregate_id, item.revision);
      await this.inbox.markEventApplied(m, item.event_id);
      await this.inbox.markHeldReferenceApplied(m, item.event_id);
    }
    for (const id of new Set(pending.map(({ item }) => item.aggregate_id)))
      await this.updateGap(m, id);
    return [];
  }

  private async outsideQuotaCandidates(
    m: DatabaseTransaction,
    selected: ReplayCandidate[],
    selectedKeys: ReadonlySet<string>,
    sourceQuotaEvidence: (buckets: ReplayQuotaBucket[]) => Promise<ReplayQuotaEvidence[]>,
  ): Promise<ReplayCandidate[]> {
    const buckets = new Map<string, ReplayQuotaBucket>();
    for (const { userId, day, category } of selected)
      buckets.set(dailyKey(userId, day, category), { userId, day, category });
    const evidence: ReplayQuotaEvidence[] = [];
    const batch = [...buckets.values()];
    for (let i = 0; i < batch.length; i += 100) {
      const slice = batch.slice(i, i + 100);
      const fromSource = await sourceQuotaEvidence(slice);
      const fromInbox = await this.inbox.findLocalQuotaEvidence(m, slice);
      if (fromInbox.length > 500 || evidence.length + fromSource.length + fromInbox.length > 5000)
        throw new Error("Too many competing rewards to verify scoped replay");
      evidence.push(...fromSource, ...fromInbox);
    }
    const outside = new Map<string, ReplayQuotaEvidence>();
    for (const row of evidence) {
      if (selectedKeys.has(row.rewardKey)) continue;
      const first = outside.get(row.rewardKey);
      if (!first || BigInt(row.revision) < BigInt(first.revision)) outside.set(row.rewardKey, row);
    }
    const resolved = await this.inbox.findResolvedQuotaRewards(m, [...outside.values()]);
    for (const row of resolved) outside.delete(row.rewardKey);
    if (!outside.size) return [];

    const policies = await this.inbox.findReplayPolicies(
      m,
      JSON.stringify([...new Map([...outside.values()].map((row) => [
        row.eventId, { id: row.eventId, occurred_at: row.occurredAt },
      ])).values()]),
    );
    const byEvent = new Map(policies.map(({ id, config }) => [id, config]));
    const candidates: ReplayCandidate[] = [];
    for (const row of outside.values()) {
      const rules = byEvent.get(row.eventId)!;
      const points = pointsFor(row.category, rules);
      if (points > 0) candidates.push({
        userId: row.userId,
        actorId: row.actorId,
        category: row.category,
        scope: row.scope,
        day: row.day,
        points,
        rules,
        revision: { aggregateId: row.aggregateId, revision: row.revision },
      });
    }
    return candidates;
  }

  private async lockUsers(m: DatabaseTransaction, users: string[]) {
    for (const id of users)
      await this.scoring.lockUser(m, id);
  }

  private async apply(
    m: DatabaseTransaction,
    event: ReputationEvent,
    notify: boolean,
  ) {
    const { data } = event;
    const old = await this.scoring.findEntitlements(m, data.aggregateId);
    const users = [
      ...new Set([
        ...old.map((r) => r.beneficiary_id),
        ...data.rewards.map((r) => r.beneficiaryId),
      ]),
    ].sort();
    await this.lockUsers(m, users);
    const [policy] = await this.scoring.findPolicyAt(m, data.occurredAt);
    // Events may predate the first consumer deployment. The initial policy is the explicit baseline.
    const rules =
      policy ??
      (
        await this.scoring.findInitialPolicy(m)
      )[0];
    const current = new Map(data.rewards.map((r) => [r.key, r]));
    const oldByKey = new Map(old.map((entry) => [entry.reward_key, entry]));
    // Revoke obsolete grants before granting replacement acceptance.
    for (const previous of old) {
      const next = current.get(previous.reward_key);
      if (
        next &&
        (next.beneficiaryId !== previous.beneficiary_id ||
          next.category !== previous.category)
      )
        throw new InvalidRewardTransition("Reward identity changed");
      if (previous.active && (!next || !next.eligible))
        await this.change(
          m,
          event,
          previous,
          -(previous.amount ?? 0),
          false,
          "revoked",
        );
    }
    for (const reward of data.rewards.sort((a, b) =>
      a.key.localeCompare(b.key),
    )) {
      let entry = oldByKey.get(reward.key);
      if (!entry) {
        const [created] = await this.scoring.insertEntitlement(
          m,
          reward.key,
          data.aggregateId,
          reward.beneficiaryId,
          reward.actorId,
          reward.courseId ?? "general",
          reward.category,
          reward.occurredAt,
        );
        entry = created;
      }
      if (
        !rewardEligible(reward) ||
        entry.active ||
        entry.suppressed
      )
        continue;
      if (entry.amount === null) {
        const amount = pointsFor(reward.category, rules.config);
        const day = businessDate(
          reward.category === "upvote" ? data.occurredAt : entry.original_at,
        );
        await this.scoring.ensureDailyBudget(m, entry.beneficiary_id, day, entry.category);
        const [budget] = await this.scoring.lockDailyBudget(m, entry.beneficiary_id, day, entry.category);
        let capped = false;
        if (rules.config.capEnabled && entry.category === "upvote") {
          await this.scoring.ensurePairBudget(m, entry.beneficiary_id, entry.actor_id, day);
          const [pair] = await this.scoring.lockPairBudget(m, entry.beneficiary_id, entry.actor_id, day);
          capped =
            budget.gross_awarded + amount > rules.config.upvoteDailyCap ||
            pair.awarded >= rules.config.pairDailyCap;
        }
        if (rules.config.capEnabled && entry.category === "publication")
          capped = budget.gross_awarded >= rules.config.publicationDailyCap;
        entry.amount = amount;
        entry.rule_version = rules.version;
        entry.suppressed = capped;
        entry.decision_business_date = day;
        await this.scoring.updateEntitlementDecision(m, entry.reward_key, amount, rules.version, capped, day);
        await this.scoring.insertDecision(
          m,
          entry.reward_key,
          event.eventId,
          data.aggregateId,
          data.reputationRevision,
          entry.beneficiary_id,
          entry.actor_id,
          entry.scope,
          entry.category,
          day,
          rules.version,
          amount,
          capped ? "capped" : amount === 0 ? "zero" : "granted",
        );
        if (capped || amount === 0) continue;
        // Quota is gross grants; revocations and restoration never replenish or re-consume it.
        await this.scoring.incrementDailyBudget(
          m,
          entry.beneficiary_id,
          day,
          entry.category,
          entry.category === "publication" ? 1 : amount,
        );
        if (entry.category === "upvote")
          await this.scoring.incrementPairBudget(m, entry.beneficiary_id, entry.actor_id, day);
      }
      if (entry.amount)
        await this.change(m, event, entry, entry.amount, true, "granted");
    }
    const effects = await this.scoring.findLedgerEffects(m, event.eventId);
    for (const effect of effects) {
      if (notify && Number(effect.delta) !== 0)
        await this.scoring.appendNotification(
          m,
          "reputation.changed",
          JSON.stringify({
              recipientId: effect.user_id,
              delta: Number(effect.delta),
              reason: Number(effect.delta) < 0 ? "revoked" : "granted",
            }),
        );
      for (const scope of [
        "total",
        ...effect.scopes.filter((scope) => scope !== "general"),
      ])
        await this.evaluateBadges(
          m,
          effect.user_id,
          scope,
          rules.version,
          event.eventId,
          notify,
        );
    }
  }
  private async change(
    m: DatabaseTransaction,
    event: ReputationEvent,
    entry: Entitlement,
    delta: number,
    active: boolean,
    reason: string,
  ) {
    if (!delta) return;
    const rows = await this.scoring.appendLedgerEntry(
      m,
      entry.reward_key,
      event.eventId,
      entry.beneficiary_id,
      entry.scope,
      delta,
      entry.rule_version,
      entry.decision_business_date ?? businessDate(entry.original_at),
      reason,
    );
    if (!rows.length) return;
    await this.scoring.setEntitlementActive(m, entry.reward_key, active);
    entry.active = active;
    await this.scoring.incrementUserScore(m, entry.beneficiary_id, delta, entry.scope === "general" ? delta : 0);
    if (entry.scope !== "general")
      await this.scoring.incrementCourseScore(m, entry.beneficiary_id, entry.scope, delta);
  }
  private async evaluateBadges(
    m: DatabaseTransaction,
    userId: string,
    scope: string,
    eventRuleVersion: number,
    eventId: string,
    notify: boolean,
  ) {
    const [last] = await this.scoring.findLastBadgeEvaluation(m, userId, scope);
    const version = Math.max(eventRuleVersion, last?.rule_version ?? 0);
    const [rule] = await this.scoring.findPolicyByVersion(m, version);

    const [score] =
      scope === "total"
        ? await this.scoring.findTotalScore(m, userId)
        : await this.scoring.findCourseScore(m, userId, scope);
    await this.scoring.upsertBadgeEvaluation(m, userId, scope, rule.version, score?.score ?? "0", eventId);
    for (const [index, code] of ["Helper", "Contributor", "Expert"].entries()) {
      const earned = Number(score?.score ?? 0) >= rule.config.thresholds[index];
      const [badge] = await this.scoring.findBadge(m, userId, scope, code);
      if (!badge && !earned) continue;
      await this.scoring.upsertBadge(m, userId, scope, code, earned, rule.version);
      await this.scoring.insertBadgeDecision(
        m,
        userId,
        scope,
        code,
        rule.version,
        rule.config.thresholds[index],
        score?.score ?? "0",
        earned,
        eventId,
      );
      if (notify && !badge && earned)
        await this.scoring.appendNotification(
          m,
          "badge.awarded",
          JSON.stringify({ recipientId: userId, badgeName: code, scope }),
        );
      if (notify && badge?.active && !earned)
        await this.scoring.appendNotification(
          m,
          "badge.revoked",
          JSON.stringify({ recipientId: userId, badgeName: code, scope }),
        );
    }
  }
}
