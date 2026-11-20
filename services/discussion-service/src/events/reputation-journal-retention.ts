export function reputationJournalRetentionDays(configured: unknown): number {
  const days = Number(configured);
  return Number.isFinite(days) ? Math.max(8, days) : 90;
}
