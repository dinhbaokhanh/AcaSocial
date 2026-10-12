'use client';

import { useNotifications } from '@/lib/notifications/context';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const { unreadCount, togglePanel, isOpen } = useNotifications();

  return (
    <button
      type="button"
      className={styles.bell}
      aria-label="Thông báo"
      aria-expanded={isOpen}
      aria-controls="notification-panel"
      onClick={togglePanel}
      title="Thông báo"
    >
      <span>Thông báo</span>
      {unreadCount > 0 && <span className={styles.badge} aria-label={`${unreadCount} thông báo chưa đọc`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
  );
}
