import { apiPost, apiDelete } from "./client";
import type { CastVotePayload, TargetType, VoteType } from "@/types";
interface VoteResult {
  action: string;
  voteType: VoteType | null;
  upvoteCount: number;
  downvoteCount: number;
}

export const votesApi = {
  castVote: (
    targetType: TargetType,
    targetId: string,
    data: CastVotePayload,
  ) => {
    const path = `/api/${targetType === "discussion" ? "discussions" : `${targetType}s`}/${targetId}/vote`;
    return apiPost<VoteResult>(path, data, true);
  },

  removeVote: (targetType: TargetType, targetId: string) => {
    const path = `/api/${targetType === "discussion" ? "discussions" : `${targetType}s`}/${targetId}/vote`;
    return apiDelete<VoteResult>(path);
  },
};
