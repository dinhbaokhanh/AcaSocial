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
    const path =
      targetType === "discussion"
        ? `/api/discussions/${targetId}/vote`
        : `/api/comments/${targetId}/vote`;
    return apiPost<VoteResult>(path, data, true);
  },

  removeVote: (targetType: TargetType, targetId: string) => {
    const path =
      targetType === "discussion"
        ? `/api/discussions/${targetId}/vote`
        : `/api/comments/${targetId}/vote`;
    return apiDelete<VoteResult>(path);
  },
};
