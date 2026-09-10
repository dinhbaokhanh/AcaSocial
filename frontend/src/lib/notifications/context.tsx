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

import { useAuth } from '@/lib/auth/context';
import { apiGet, apiPatch, getAccessToken } from '@/lib/api/client';
import { API_BASE_URL } from '@/lib/constants';
import { consumeNotificationStream } from './stream';

export type NotificationType =
  | 'answer.created'
  | 'answer.accepted'
  | 'mention.created'
  | 'badge.awarded'
  | 'user.followed'
  | 'system.security_warning'
  | 'discussion.created'
  | 'comment.created';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  actorName?: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  pushNotification: (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  triggerDemo: (type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const demoTemplates: Record<NotificationType, Omit<AppNotification, 'id' | 'createdAt' | 'read'>> = {
  'answer.created': {
    type: 'answer.created',
    title: 'New answer received',
    body: 'Huy just answered your question on machine learning.',
    actorName: 'Huy',
  },
  'answer.accepted': {
    type: 'answer.accepted',
    title: 'Your answer was accepted',
    body: 'Your answer on reinforcement learning has been marked as the accepted solution.',
    actorName: 'Lan',
  },
  'mention.created': {
    type: 'mention.created',
    title: 'You were mentioned',
    body: 'Nam mentioned you in a discussion about distributed systems.',
    actorName: 'Nam',
  },
  'badge.awarded': {
    type: 'badge.awarded',
    title: 'New badge unlocked',
    body: 'You earned the Contributor badge for helping the community.',
    actorName: 'AcaSocial',
  },
  'user.followed': {
    type: 'user.followed',
    title: 'New follower',
    body: 'Your profile was followed by an academic peer.',
    actorName: 'An',
  },
  'system.security_warning': {
    type: 'system.security_warning',
    title: 'Security alert',
    body: 'A new sign-in was detected from a different device. Review it now.',
    actorName: 'System',
  },
  'discussion.created': {
    type: 'discussion.created',
    title: 'Bài viết mới được tạo',
    body: 'Bạn vừa tạo một bài viết mới thành công.',
  },
  'comment.created': {
    type: 'comment.created',
    title: 'Có bình luận mới trên bài viết của bạn',
    body: 'Có người vừa bình luận vào bài viết của bạn.',
  },
};

// Shape returned by the notification-service REST API
interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  actorId?: string | null;
  data?: Record<string, unknown>;
}

function mapApiNotification(n: ApiNotification): AppNotification {
  return {
    id: n.id,
    type: (n.type as NotificationType) ?? 'system.security_warning',
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    read: n.readAt !== null,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <SessionNotificationProvider key={user?.id ?? 'guest'} userId={user?.id}>{children}</SessionNotificationProvider>;
}

function SessionNotificationProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const pushNotification = useCallback((input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const entry: AppNotification = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((current) => [entry, ...current]);
    setIsOpen(true);
  }, []);

  const markRead = useCallback((id: string) => {
    if (!userId) return;
    void apiPatch<ApiNotification>(`/api/notifications/${id}/read`, {}).then((saved) => {
      setNotifications((current) => current.map((item) => item.id === id ? mapApiNotification(saved) : item));
    }).catch((error) => console.error('Could not mark notification read', error));
  }, [userId]);

  const markAllRead = useCallback(() => {
    notifications.filter((item) => !item.read).forEach((item) => markRead(item.id));
  }, [notifications, markRead]);

  const triggerDemo = useCallback((type: NotificationType = 'answer.created') => {
    pushNotification(demoTemplates[type]);
  }, [pushNotification]);

  useEffect(() => {
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    if (!userId) return () => controller.abort();

    const merge = (entries: ApiNotification[]) => {
      if (controller.signal.aborted) return;
      setNotifications((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        for (const entry of entries) {
          const mapped = mapApiNotification(entry);
          byId.set(entry.id, { ...mapped, read: mapped.read || byId.get(entry.id)?.read || false });
        }
        return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
      });
    };
    const load = async () => {
      const entries = await apiGet<ApiNotification[]>('/api/notifications?limit=30', true);
      merge(entries);
    };
    const connect = async () => {
      try {
        // Refresh an expired session through the standard API client before connecting.
        await load();
        if (controller.signal.aborted) return;
        const response = await fetch(
          process.env.NEXT_PUBLIC_NOTIFICATION_STREAM_URL ?? `${API_BASE_URL}/api/notifications/stream`,
          { headers: { Authorization: `Bearer ${getAccessToken()}`, Accept: 'text/event-stream' }, signal: controller.signal },
        );
        if (!response.ok || !response.body) throw new Error(`Notification stream: ${response.status}`);
        // Catch notifications created between the initial request and stream subscription.
        void load().catch((error) => console.error('Could not reload notifications', error));
        await consumeNotificationStream(response.body, (data) => {
          try {
            const entry = JSON.parse(data) as ApiNotification;
            if (entry.id && entry.createdAt) merge([entry]);
          } catch { /* Ignore malformed frames and heartbeat messages. */ }
        });
      } catch (error) {
        if (!controller.signal.aborted) console.error('Notification connection failed', error);
      } finally {
        if (!controller.signal.aborted) retry = setTimeout(() => void connect(), 3000);
      }
    };
    void connect();
    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [userId]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      isOpen,
      togglePanel: () => setIsOpen((current) => !current),
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
      pushNotification,
      markRead,
      markAllRead,
      triggerDemo,
    }),
    [notifications, isOpen, pushNotification, markRead, markAllRead, triggerDemo],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }

  return context;
}

export function createDemoNotification(type: NotificationType): Omit<AppNotification, 'id' | 'createdAt' | 'read'> {
  return demoTemplates[type];
}
