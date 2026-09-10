'use client';

import { useNotifications } from '@/lib/notifications/context';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const { unreadCount, togglePanel, openPanel } = useNotifications();

  return (
    <button
      type="button"
      className={styles.bell}
      aria-label="Notifications"
      onClick={() => (unreadCount > 0 ? togglePanel() : openPanel())}
      title="Notifications"
    >
      <span aria-hidden="true">🔔</span>
      {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
    </button>
  );
}
