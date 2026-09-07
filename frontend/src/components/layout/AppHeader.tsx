'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ROUTES, SITE_NAME } from '@/lib/constants';
import styles from './AppHeader.module.css';

export function AppHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push(ROUTES.LOGIN);
  }

  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        {/* Logo */}
        <Link href={ROUTES.HOME} className={styles.logo} aria-label={`${SITE_NAME} home`}>
          <span className={styles.logoMark} aria-hidden="true">AS</span>
          <span className={styles.logoText}>{SITE_NAME}</span>
        </Link>

        {/* Search — center */}
        <div className={styles.searchWrap}>
          <label htmlFor="global-search" className="sr-only">Search</label>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon} aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M6.5 1a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM0 6.5a6.5 6.5 0 1112.07 3.364l2.533 2.534a.5.5 0 11-.707.707L11.363 9.57A6.5 6.5 0 010 6.5z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="global-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search posts, topics, users…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  router.push(`/?search=${encodeURIComponent(e.currentTarget.value.trim())}`);
                }
              }}
            />
            <kbd className={styles.searchKbd} aria-hidden="true">/</kbd>
          </div>
        </div>

        {/* Right actions */}
        <div className={styles.actions}>
          {isAuthenticated && user ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(ROUTES.POST_CREATE)}
              >
                + Ask
              </Button>
              <Link href={ROUTES.PROFILE} className={styles.avatarLink} aria-label="Your profile">
                <Avatar
                  src={user.avatarUrl}
                  alt={user.fullName}
                  size="sm"
                />
              </Link>
              <button
                className={styles.logoutBtn}
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className={styles.ghostWhite} onClick={() => router.push(ROUTES.LOGIN)}>
                Sign in
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push(ROUTES.REGISTER)}>
                Join
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
