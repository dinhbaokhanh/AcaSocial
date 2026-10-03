'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/lib/rooms/context';
import styles from './SidebarNav.module.css';
import { useAuth } from '@/lib/auth/context';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Bảng tin',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 7l7-5 7 5v9a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M6 16v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/questions',
    label: 'Câu hỏi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 13v-1m0-2.5c0-1.5 2-1.5 2-3a2 2 0 00-4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/discussions',
    label: 'Thảo luận',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 3h14a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 2V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/tags',
    label: 'Thẻ chủ đề',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 2h7l7 7-7 7-7-7V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { rooms, selectedRoom, selectRoom } = useRoom();
  const { user } = useAuth();

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <nav className={styles.nav} aria-label="Điều hướng chính">
      <ul role="list" className={styles.list}>
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={[styles.link, isActive(item) ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.divider} />

      {user && ['admin', 'moderator'].includes(user.role) && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Quản trị</p>
          <ul role="list" className={styles.list}>
            <li><Link className={[styles.link, pathname.startsWith('/moderation') ? styles.active : ''].filter(Boolean).join(' ')} href="/moderation"><span className={styles.label}>Duyệt bài đăng</span></Link></li>
            {user?.role === 'admin' && <li><Link className={[styles.link, pathname.startsWith('/admin/users') ? styles.active : ''].filter(Boolean).join(' ')} href="/admin/users"><span className={styles.label}>Phân quyền</span></Link></li>}
          </ul>
        </div>
      )}

      {user && ['admin', 'moderator'].includes(user.role) && <div className={styles.divider} />}

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Phòng thảo luận</p>
        <ul role="list" className={styles.list}>
          {rooms.filter((room) => room.status === 'active').slice(0, 8).map((room) => (
            <li key={room.id}>
              <button
                type="button"
                className={[
                  styles.link,
                  styles.roomButton,
                  selectedRoom?.id === room.id ? styles.active : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  selectRoom(room);
                  router.push('/');
                }}
              >
                <span className={styles.roomGlyph} aria-hidden="true">
                  {room.roomType === 'course' ? 'C' : room.roomType === 'major' ? 'M' : room.roomType === 'event' ? 'E' : 'F'}
                </span>
                <span className={styles.label}>{room.name}</span>
              </button>
            </li>
          ))}
          {rooms.length === 0 && <li className={styles.noRooms}>Chưa có phòng thảo luận</li>}
        </ul>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Tài khoản</p>
        <ul role="list" className={styles.list}>
          <li>
            <Link
              href="/profile"
              className={[styles.link, pathname.startsWith('/profile') ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
              aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
            >
              <span className={styles.icon}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.label}>Hồ sơ</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
