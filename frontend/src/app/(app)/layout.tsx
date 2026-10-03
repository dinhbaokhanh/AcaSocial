import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RoomProvider } from '@/lib/rooms/context';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <RoomProvider><AppShell>{children}</AppShell></RoomProvider>;
}
