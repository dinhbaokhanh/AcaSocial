'use client';

import { useNotifications } from '@/lib/notifications/context';
import { Button } from '@/components/ui/Button';
import styles from './NotificationPanel.module.css';

export function NotificationPanel() {
  const { notifications, unreadCount, isOpen, closePanel, markRead, markAllRead } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={closePanel}>
      <aside className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Inbox</p>
            <h3>Notifications</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={closePanel} aria-label="Close notifications">
            ×
          </button>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>
        </div>

        <div className={styles.list}>
          {notifications.length === 0 ? (
            <div className={styles.empty}>No notifications yet.</div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${item.read ? styles.read : styles.unread}`}
                onClick={() => markRead(item.id)}
              >
                <div className={styles.dot} aria-hidden="true" />
                <div className={styles.content}>
                  <div className={styles.row}>
                    <strong>{item.title}</strong>
                    {!item.read && <span className={styles.new}>New</span>}
                  </div>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>{unreadCount} unread</span>
        </div>
      </aside>
    </div>
  );
}
