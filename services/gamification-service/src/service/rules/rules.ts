export interface Rules {
  upvotePoints: number;
  acceptedPoints: number;
  publicationPoints: number;
  upvoteDailyCap: number;
  publicationDailyCap: number;
  pairDailyCap: number;
  capEnabled: boolean;
  thresholds: number[];
}

export interface RuleUpdate extends Rules {
  expectedVersion: number;
  reason: string;
}
