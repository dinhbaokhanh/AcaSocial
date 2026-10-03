'use client';

import { useNotifications } from '@/lib/notifications/context';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const { unreadCount, togglePanel, openPanel } = useNotifications();

  return (
    <button
      type="button"
      className={styles.bell}
      aria-label="Thông báo"
      onClick={() => (unreadCount > 0 ? togglePanel() : openPanel())}
      title="Thông báo"
    >
      <span aria-hidden="true">🔔</span>
      {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
    </button>
  );
}
