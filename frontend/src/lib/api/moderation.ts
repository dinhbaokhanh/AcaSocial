import { apiGet, apiPatch } from "./client";
export type ReviewDecision = "allow" | "hide" | "hold";

export interface PendingContent {
  id: string;
  entityType: "discussion";
  title: string;
  content: string;
  contentVersion: number;
  createdAt: string;
  updatedAt: string;
  author?: { fullName: string; avatarUrl?: string };
  authorId: string | null;
  isAnonymous: boolean;
  roomId: string | null;
  roomName: string;
  moderationStatus: "pending" | "approved" | "hidden";
  visibility: "visible" | "held" | "hidden";
  isRevision: boolean;
  moderationNote: string;
  media: { mediaId: string }[];
  reviews: {
    id: string;
    decision: ReviewDecision;
    note: string;
    reviewerId: string;
    createdAt: string;
    contentVersion: number;
  }[];
}
export interface ModerationQueue {
  data: PendingContent[];
  counts: Record<"pending" | "approved" | "hidden", number>;
  meta: { page: number; totalItems: number; totalPages: number };
}
export const moderationApi = {
  pending: (status = "pending", page = 1, roomId = "", search = "") =>
    apiGet<ModerationQueue>(
      `/api/moderation/pending?${new URLSearchParams({ status, page: String(page), ...(roomId ? { roomId } : {}), ...(search ? { search } : {}) })}`,
      true,
    ),
  review: (item: PendingContent, decision: ReviewDecision, note: string) =>
    apiPatch(`/api/moderation/${item.entityType}/${item.id}`, {
      decision,
      expectedModerationStatus: item.moderationStatus,
      expectedVersion: item.contentVersion,
      expectedContent: item.content,
      note,
    }),
};
