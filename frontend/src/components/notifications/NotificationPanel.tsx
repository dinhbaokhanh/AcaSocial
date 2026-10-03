'use client';

import { useNotifications } from '@/lib/notifications/context';
import { Button } from '@/components/ui/Button';
import styles from './NotificationPanel.module.css';
import { useRouter } from 'next/navigation';

export function NotificationPanel() {
  const router = useRouter();
  const { notifications, unreadCount, isOpen, closePanel, markRead, markAllRead } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={closePanel}>
      <aside className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Hộp thông báo</p>
            <h3>Thông báo</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={closePanel} aria-label="Đóng thông báo">
            ×
          </button>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={markAllRead}>Đánh dấu tất cả đã đọc</Button>
        </div>

        <div className={styles.list}>
          {notifications.length === 0 ? (
            <div className={styles.empty}>Chưa có thông báo.</div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${item.read ? styles.read : styles.unread}`}
                onClick={() => {
                  markRead(item.id);
                  if (item.href) {
                    closePanel();
                    router.push(item.href);
                  }
                }}
              >
                <div className={styles.dot} aria-hidden="true" />
                <div className={styles.content}>
                  <div className={styles.row}>
                    <strong>{item.title}</strong>
                    {!item.read && <span className={styles.new}>Mới</span>}
                  </div>
                  <p>{item.body}</p>
                  {item.href && <small className={styles.openPost}>Xem bài viết →</small>}
                  <small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>{unreadCount} chưa đọc</span>
        </div>
      </aside>
    </div>
  );
}
