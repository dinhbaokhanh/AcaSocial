"use client";

import { useState, useTransition } from "react";
import { votesApi } from "@/lib/api/votes";
import type { TargetType, VoteType } from "@/types";
import styles from "./VotePill.module.css";

interface VotePillProps {
  targetType: TargetType;
  targetId: string;
  upvoteCount: number;
  downvoteCount: number;
  /** Current authenticated user's vote, if any */
  myVote?: VoteType | null;
  /** vertical = stacked (feed cards), horizontal = inline (compact) */
  orientation?: "vertical" | "horizontal";
  /** Disable interaction (e.g. user not logged in) */
  disabled?: boolean;
  onVoteChange?: (
    newUpvotes: number,
    newDownvotes: number,
    newVote: VoteType | null,
  ) => void;
}

export function VotePill({
  targetType,
  targetId,
  upvoteCount,
  downvoteCount,
  myVote = null,
  orientation = "vertical",
  disabled = false,
  onVoteChange,
}: VotePillProps) {
  const [localUpvotes, setLocalUpvotes] = useState(upvoteCount);
  const [localDownvotes, setLocalDownvotes] = useState(downvoteCount);
  const [localVote, setLocalVote] = useState<VoteType | null>(myVote);
  const [isPending, startTransition] = useTransition();

  const netScore = localUpvotes - localDownvotes;

  function handleVote(type: VoteType) {
    if (disabled || isPending) return;

    // Optimistic update
    let newUp = localUpvotes;
    let newDown = localDownvotes;
    let newVote: VoteType | null;

    if (localVote === type) {
      // Toggle off
      if (type === "upvote") newUp = Math.max(0, newUp - 1);
      else newDown = Math.max(0, newDown - 1);
      newVote = null;
    } else {
      // Remove old vote then add new
      if (localVote === "upvote") newUp = Math.max(0, newUp - 1);
      if (localVote === "downvote") newDown = Math.max(0, newDown - 1);
      if (type === "upvote") newUp += 1;
      else newDown += 1;
      newVote = type;
    }

    setLocalUpvotes(newUp);
    setLocalDownvotes(newDown);
    setLocalVote(newVote);
    onVoteChange?.(newUp, newDown, newVote);

    startTransition(async () => {
      try {
        const result =
          newVote === null
            ? await votesApi.removeVote(targetType, targetId)
            : await votesApi.castVote(targetType, targetId, {
                voteType: newVote,
              });
        setLocalUpvotes(result.upvoteCount);
        setLocalDownvotes(result.downvoteCount);
        setLocalVote(result.voteType);
        onVoteChange?.(
          result.upvoteCount,
          result.downvoteCount,
          result.voteType,
        );
      } catch {
        // Revert on failure
        setLocalUpvotes(upvoteCount);
        setLocalDownvotes(downvoteCount);
        setLocalVote(myVote);
        onVoteChange?.(upvoteCount, downvoteCount, myVote ?? null);
      }
    });
  }

  return (
    <div
      className={[
        styles.pill,
        styles[orientation],
        disabled ? styles.disabled : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Vote. Score: ${netScore}`}
    >
      <button
        className={[styles.btn, localVote === "upvote" ? styles.active : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={() => handleVote("upvote")}
        aria-label="Upvote"
        aria-pressed={localVote === "upvote"}
        disabled={disabled || isPending}
        title={disabled ? "Sign in to vote" : "Upvote"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="M7 2l5 6H2l5-6z" fill="currentColor" />
        </svg>
      </button>

      <span
        className={[
          styles.score,
          styles.tabular,
          netScore > 0 ? styles.positive : netScore < 0 ? styles.negative : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      >
        {netScore}
      </span>

      <button
        className={[
          styles.btn,
          localVote === "downvote" ? styles.activeDown : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => handleVote("downvote")}
        aria-label="Downvote"
        aria-pressed={localVote === "downvote"}
        disabled={disabled || isPending}
        title={disabled ? "Sign in to vote" : "Downvote"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="M7 12L2 6h10l-5 6z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
