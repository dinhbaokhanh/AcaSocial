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
      <aside id="notification-panel" className={styles.panel} aria-label="Thông báo" onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3>Thông báo</h3>
            <p className={styles.summary}>{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc tất cả thông báo'}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={closePanel} aria-label="Đóng thông báo">
            Đóng
          </button>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>Đánh dấu tất cả đã đọc</Button>
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
                <div className={styles.content}>
                  <div className={styles.row}>
                    <strong>{item.title}</strong>
                    {!item.read && <span className={styles.new}>Chưa đọc</span>}
                  </div>
                  <p>{item.body}</p>
                  <div className={styles.meta}>
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                    {item.href && <span className={styles.openPost}>Xem bài đăng</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

      </aside>
    </div>
  );
}
