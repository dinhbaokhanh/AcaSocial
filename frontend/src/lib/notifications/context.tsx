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

export type NotificationType =
  | 'answer.created'
  | 'answer.accepted'
  | 'mention.created'
  | 'badge.awarded'
  | 'user.followed'
  | 'system.security_warning';

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
};

const seedNotifications: AppNotification[] = [
  {
    id: 'seed-1',
    type: 'answer.created',
    title: 'New answer received',
    body: 'Minh just answered your question on database indexing.',
    actorName: 'Minh',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
  },
  {
    id: 'seed-2',
    type: 'badge.awarded',
    title: 'Badge unlocked',
    body: 'You earned the Research Helper badge.',
    actorName: 'AcaSocial',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: true,
  },
  {
    id: 'seed-3',
    type: 'system.security_warning',
    title: 'Security alert',
    body: 'A new login was detected from Chrome on a new device.',
    actorName: 'System',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: false,
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
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
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const triggerDemo = useCallback((type: NotificationType = 'answer.created') => {
    const template = demoTemplates[type];
    pushNotification(template);
  }, [pushNotification]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_NOTIFICATION_STREAM_URL) return;

    const source = new EventSource(process.env.NEXT_PUBLIC_NOTIFICATION_STREAM_URL);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Omit<AppNotification, 'id' | 'createdAt' | 'read'>;
        pushNotification(payload);
      } catch {
        // Ignore malformed payloads in a demo environment.
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [pushNotification]);

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
