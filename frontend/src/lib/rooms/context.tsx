'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { roomsApi } from '@/lib/api/rooms';
import { useAuth } from '@/lib/auth/context';
import type { Room } from '@/types';

const STORAGE_KEY = 'acasocial_selected_room';

interface RoomContextValue {
  rooms: Room[];
  selectedRoom: Room | null;
  loading: boolean;
  error: string | null;
  selectRoom: (room: Room) => void;
  refresh: () => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await roomsApi.list();
      setRooms(result);
      const selectedId = localStorage.getItem(STORAGE_KEY);
      const selected = result.find(
        (room) => room.id === selectedId && room.status === 'active',
      );
      setSelectedRoom(selected ?? null);
      if (selectedId && !selected) localStorage.removeItem(STORAGE_KEY);
    } catch {
      setError('Không tải được danh sách room.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh, user?.id, user?.role]);

  const selectRoom = useCallback((room: Room) => {
    localStorage.setItem(STORAGE_KEY, room.id);
    setSelectedRoom(room);
  }, []);

  const value = useMemo(
    () => ({ rooms, selectedRoom, loading, error, selectRoom, refresh }),
    [rooms, selectedRoom, loading, error, selectRoom, refresh],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within RoomProvider');
  return context;
}
