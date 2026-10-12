import { apiGet, apiPost, apiPatch } from "./client";
import type { Room, RoomType } from "@/types";

function query(type?: RoomType, parentRoomId?: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (parentRoomId) params.set("parentRoomId", parentRoomId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export type RoomMember = {
  fullName?: string;
  id: string;
  userId: string;
  role: "owner" | "moderator" | "contributor" | "member";
  status: "active" | "pending" | "muted" | "banned" | "left";
  postPermission: "inherit" | "direct" | "approval" | "blocked";
};
export type PolicyAudit = {
  id: string;
  actor_id: string;
  member_id: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: string;
};
export const roomsApi = {
  members: (id: string) =>
    apiGet<RoomMember[]>(`/api/rooms/${id}/members`, true),
  policyHistory: (id: string) =>
    apiGet<PolicyAudit[]>(`/api/rooms/${id}/policy-history`, true),
  policy: (
    id: string,
    body: { reviewPolicy: Room["reviewPolicy"]; policyLocked?: boolean },
  ) => apiPatch<Room>(`/api/rooms/${id}/policy`, body),
  updateMember: (id: string, member: RoomMember) =>
    apiPatch<RoomMember>(`/api/rooms/${id}/members/${member.userId}`, {
      role: member.role,
      status: member.status,
      postPermission: member.postPermission,
    }),
  list: (type?: RoomType, parentRoomId?: string) =>
    apiGet<Room[]>(`/api/rooms${query(type, parentRoomId)}`),
  get: (idOrSlug: string) => apiGet<Room>(`/api/rooms/${idOrSlug}`),
  join: (id: string) => apiPost(`/api/rooms/${id}/join`, {}, true),
};
