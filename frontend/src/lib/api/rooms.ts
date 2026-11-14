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
export interface ClosureSchedule {
 id: string; room_id: string; close_at: string; reason: string; version: number; status: 'pending' | 'completed' | 'cancelled';
}
export interface RoomAnnouncement { id: string; room_id: string; close_at: string; reason: string; name: string; slug: string; version: number; }
export interface CreateRoomInput { slug: string; name: string; description: string; roomType: RoomType; parentRoomId?: string; majorId?: string; majorCourseId?: string; }
export const roomsApi = {
  create: (body: CreateRoomInput) => apiPost<Room>('/api/rooms', body, true),
  update: (id: string, body: { name: string; description: string; expectedVersion: number }) => apiPatch<Room>(`/api/rooms/${id}`, body),
  status: (id: string, status: Room['status'], expectedVersion: number, reason: string) => apiPatch<Room>(`/api/rooms/${id}/status`, { status, expectedVersion, reason }),
  schedule: (id: string) => apiGet<ClosureSchedule | null>(`/api/rooms/${id}/closure-schedule`, true),
  setSchedule: (id: string, body: { closeAt: string; reason: string; expectedVersion?: number }, update: boolean) => update ? apiPatch<ClosureSchedule>(`/api/rooms/${id}/closure-schedule`, body) : apiPost<ClosureSchedule>(`/api/rooms/${id}/closure-schedule`, body, true),
  cancelSchedule: (id: string, expectedVersion: number, reason: string) => apiPost<ClosureSchedule>(`/api/rooms/${id}/closure-schedule/cancel`, { expectedVersion, reason }, true),
  announcements: (page = 1) => apiGet<RoomAnnouncement[]>(`/api/room-announcements?page=${page}`, true),
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
