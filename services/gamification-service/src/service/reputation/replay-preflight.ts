import type { Rules } from "../rules/rules";
import type { ReputationEvent, Reward } from "./reputation.engine";

export interface ReplayItem {
  event_id: string;
  aggregate_id: string;
  revision: string;
  payload: ReputationEvent | null;
  payload_hash: string | null;
}

export interface ReplayRevision {
  aggregateId: string;
  revision: string;
}

export interface ReplayFinding {
  kind: "missing_revision" | "state" | "daily_cap" | "pair_cap";
  message: string;
  userId?: string;
  actorId?: string;
  day?: string;
  category?: Reward["category"];
  scopes?: string[];
  revisions?: ReplayRevision[];
}

export interface ReplayCandidate {
  userId: string;
  actorId: string;
  category: "upvote" | "publication";
  day: string;
  scope: string;
  points: number;
  rules: Rules;
  revision: ReplayRevision;
}

export type ReplayQuotaBucket = Pick<ReplayCandidate, "userId" | "day" | "category">;

export interface ReplayQuotaEvidence extends ReplayQuotaBucket {
  eventId: string;
  aggregateId: string;
  revision: string;
  rewardKey: string;
  actorId: string;
  scope: string;
  occurredAt: string;
}

export function canUseQuota(
  candidate: ReplayCandidate,
  daily: Map<string, number>,
  pairs: Map<string, number>,
) {
  const { category, rules, userId, actorId, day, points } = candidate;
  const isVote = category === "upvote";
  const cost = isVote ? points : 1;
  const cap = isVote ? rules.upvoteDailyCap : rules.publicationDailyCap;
  return !rules.capEnabled || (
    (daily.get(dailyKey(userId, day, category)) ?? 0) + cost <= cap &&
    (!isVote || (pairs.get(pairKey(userId, actorId, day)) ?? 0) < rules.pairDailyCap)
  );
}

interface Bucket {
  kind: "daily_cap" | "pair_cap";
  userId: string;
  actorId?: string;
  category: ReplayCandidate["category"];
  day: string;
  demand: number;
  cap: number;
  candidates: ReplayCandidate[];
}

export const dailyKey = (user: string, day: string, category: string) =>
  `${user}:${day}:${category}`;
export const pairKey = (user: string, actor: string, day: string) =>
  `${user}:${actor}:${day}`;

export function quotaFindings(
  candidates: ReplayCandidate[],
  daily: Map<string, number>,
  pairs: Map<string, number>,
  selected?: ReadonlySet<ReplayCandidate>,
): ReplayFinding[] {
  const buckets = new Map<string, Bucket>();
  function add(key: string, candidate: ReplayCandidate, kind: Bucket["kind"], cost: number, cap: number) {
    const { userId, actorId, category, day, rules } = candidate;
    const bucket = buckets.get(key) ?? {
      kind, userId, actorId: kind === "pair_cap" ? actorId : undefined, category, day,
      demand: 0, cap: Infinity, candidates: [],
    };
    bucket.demand += cost;
    if (rules.capEnabled) bucket.cap = Math.min(bucket.cap, cap);
    bucket.candidates.push(candidate);
    buckets.set(key, bucket);
  }
  for (const c of candidates) {
    const isVote = c.category === "upvote";
    const dailyBudget = dailyKey(c.userId, c.day, c.category);
    const pairBudget = pairKey(c.userId, c.actorId, c.day);
    const cost = isVote ? c.points : 1;
    const cap = isVote ? c.rules.upvoteDailyCap : c.rules.publicationDailyCap;
    // Gross quota can only increase. This reward cannot compete if it is already capped.
    if (!canUseQuota(c, daily, pairs)) continue;
    add(dailyBudget, c, "daily_cap", cost, cap);
    if (isVote) add(pairBudget, c, "pair_cap", 1, c.rules.pairDailyCap);
  }
  const findings: ReplayFinding[] = [];
  for (const [key, bucket] of buckets) {
    const { kind, userId, actorId, day, category, cap, demand, candidates: entries } = bucket;
    if (selected && !entries.some((entry) => selected.has(entry))) continue;
    const used = (kind === "pair_cap" ? pairs : daily).get(key) ?? 0;
    const revisions = new Map(entries.map((c) => [
      `${c.revision.aggregateId}:${c.revision.revision}`, c.revision,
    ]));
    const discussions = new Set(entries.map((c) => c.revision.aggregateId));
    // An existing grant stays fixed. Only unresolved rewards across discussions
    // can exchange an available slot when their processing order changes.
    if (used + demand <= cap || discussions.size < 2) continue;
    findings.push({
      kind, userId, actorId, day, category,
      message: `Quota ${cap}, already used ${used}, competing requests ${demand}`,
      scopes: [...new Set(entries.map((c) => c.scope))].sort().slice(0, 20),
      revisions: [...revisions.values()].slice(0, 20),
    });
    if (findings.length === 20) break;
  }
  return findings;
}
