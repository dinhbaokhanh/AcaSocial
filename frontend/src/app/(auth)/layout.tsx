import type { ReactNode } from 'react';
import styles from './auth-layout.module.css';
import { SITE_NAME } from '@/lib/constants';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>AS</span>
          <span className={styles.logoText}>{SITE_NAME}</span>
        </Link>
      </header>
      <main className={styles.main} id="main-content">
        {children}
      </main>
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} {SITE_NAME}. Cộng đồng học tập và trao đổi kiến thức.</p>
      </footer>
    </div>
  );
}
