import { apiGet, apiPost } from './client';
import type { Room, RoomType } from '@/types';

function query(type?: RoomType, parentRoomId?: string) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (parentRoomId) params.set('parentRoomId', parentRoomId);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export const roomsApi = {
  list: (type?: RoomType, parentRoomId?: string) =>
    apiGet<Room[]>(`/api/rooms${query(type, parentRoomId)}`),
  get: (idOrSlug: string) => apiGet<Room>(`/api/rooms/${idOrSlug}`),
  join: (id: string) => apiPost(`/api/rooms/${id}/join`, {}, true),
};
