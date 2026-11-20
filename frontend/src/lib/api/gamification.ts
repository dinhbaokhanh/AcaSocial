import { apiGet, apiPost } from "./client";
import type { PaginatedResponse } from "@/types";
export interface ReputationSummary {
  totalScore: string;
  generalScore: string;
  updatedAt: string | null;
  startedAt: string;
  updating: boolean;
}
export interface CourseScore {
  course_id: string;
  score: string;
  updated_at: string;
}
export interface LedgerEntry {
  id: string;
  scope: string;
  delta: number;
  reason: string;
  rule_version: number;
  business_date: string;
  created_at: string;
}
export interface UserBadge {
  scope: string;
  badge_code: string;
  active: boolean;
  rule_version: number;
  earned_at: string;
  revoked_at: string | null;
}
export interface GamificationRules {
  upvotePoints: number;
  acceptedPoints: number;
  publicationPoints: number;
  upvoteDailyCap: number;
  publicationDailyCap: number;
  pairDailyCap: number;
  capEnabled: boolean;
  thresholds: number[];
}
export interface RuleSet {
  version: number;
  config: GamificationRules;
  effective_at: string;
}
export interface RuleAudit {
  id: string;
  actor_id: string;
  reason: string;
  created_at: string;
  before: RuleSet;
  after: RuleSet;
}
export interface ReconciliationJob {
  id: string;
  kind: string;
  user_id: string | null;
  status: string;
  result: {
    counts: { kind: string; count: string }[];
    totalFindings: number;
    pending: string;
    dryRun: boolean;
  } | null;
  created_at: string;
}
export interface Finding {
  id: string;
  kind: string;
  subject: string;
  expected: string;
  actual: string;
}
export interface RecoveryItem {
  aggregate_id?: string;
  event_id?: string;
  id?: string;
  expected_revision?: string;
  through_revision?: string;
  revision?: string;
  status?: string;
  attempts?: number;
  last_error?: string;
  error?: string;
}
export type RecoveryKind = "gaps" | "references" | "failures" | "inbox";
export interface ReplayScope {
  aggregateId?: string;
  fromDate?: string;
  toDate?: string;
}
export interface ReplayJob {
  id: string;
  total_events: number;
  scope?: ReplayScope;
  prerequisite_count?: number;
  cursor: number;
  status: string;
  last_error: string | null;
  created_at: string;
  findings: {
    kind: "missing_revision" | "state" | "daily_cap" | "pair_cap";
    message: string;
    userId?: string;
    actorId?: string;
    day?: string;
    scopes?: string[];
    revisions?: { aggregateId: string; revision: string }[];
  }[];
}
export const gamificationApi = {
  me: () => apiGet<ReputationSummary>("/api/gamification/me", true),
  courses: (page = 1) =>
    apiGet<PaginatedResponse<CourseScore>>(
      `/api/gamification/me/courses?page=${page}`,
      true,
    ),
  ledger: (page = 1) =>
    apiGet<PaginatedResponse<LedgerEntry>>(
      `/api/gamification/me/ledger?page=${page}`,
      true,
    ),
  badges: (page = 1) =>
    apiGet<PaginatedResponse<UserBadge>>(
      `/api/gamification/me/badges?page=${page}`,
      true,
    ),
  definitions: () =>
    apiGet<{ code: string; threshold: number; version: number }[]>(
      "/api/gamification/badges",
      true,
    ),
  rules: () => apiGet<RuleSet>("/api/admin/gamification/rules", true),
  updateRules: (
    config: GamificationRules,
    expectedVersion: number,
    reason: string,
  ) =>
    apiPost<RuleSet>(
      "/api/admin/gamification/rules",
      { ...config, expectedVersion, reason },
      true,
    ),
  audits: (page = 1) =>
    apiGet<RuleAudit[]>(`/api/admin/gamification/audits?page=${page}`, true),
  jobs: (page = 1) =>
    apiGet<ReconciliationJob[]>(
      `/api/admin/gamification/reconciliation-jobs?page=${page}`,
      true,
    ),
  reconcile: () =>
    apiPost<ReconciliationJob>(
      "/api/admin/gamification/reconciliation-jobs",
      {},
      true,
    ),
  findings: (id: string, page = 1) =>
    apiGet<Finding[]>(
      `/api/admin/gamification/reconciliation-jobs/${id}/findings?page=${page}`,
      true,
    ),
  rebuild: (
    userId: string,
    previewJobId: string,
    reason: string,
    idempotencyKey: string,
  ) =>
    apiPost<ReconciliationJob>(
      "/api/admin/gamification/rebuild-jobs",
      { userId, previewJobId, reason, idempotencyKey },
      true,
    ),
  recovery: (kind: RecoveryKind, page = 1) =>
    apiGet<RecoveryItem[]>(
      `/api/admin/gamification/${kind}?page=${page}`,
      true,
    ),
  retry: (
    kind: RecoveryKind,
    id: string,
    reason: string,
  ) => apiPost(`/api/admin/gamification/${kind}/${id}/retry`, { reason }, true),
  replayJobs: (page = 1) =>
    apiGet<ReplayJob[]>(`/api/admin/gamification/replay-jobs?page=${page}`, true),
  previewReplay: (reason: string, scope: ReplayScope) =>
    apiPost<ReplayJob>("/api/admin/gamification/replay-jobs", { reason, ...scope }, true),
  executeReplay: (id: string, reason: string) =>
    apiPost<{ status: string }>(
      `/api/admin/gamification/replay-jobs/${id}/execute`,
      { reason },
      true,
    ),
  metrics: () =>
    apiGet<Record<string, string | null>>(
      "/api/admin/gamification/metrics",
      true,
    ),
};
