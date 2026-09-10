import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { SidebarNav } from './SidebarNav';
import { PageContainer } from './PageContainer';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
  /** Optional right-rail content (e.g. trending tags, sidebar widgets) */
  rightRail?: ReactNode;
}

/**
 * AppShell composes the 3-column layout:
 *   Left sidebar (SidebarNav) | Main content | Right rail
 *
 * AppHeader is sticky at the top.
 * The sidebar and right rail collapse on smaller screens.
 */
export function AppShell({ children, rightRail }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <NotificationPanel />
      <PageContainer>
        <div className={styles.body}>
          {/* Left sidebar */}
          <aside className={styles.sidebar} aria-label="Site navigation">
            <SidebarNav />
          </aside>

          {/* Main content area */}
          <main className={styles.main} id="main-content">
            {children}
          </main>

          {/* Right rail — optional */}
          {rightRail && (
            <aside className={styles.rightRail} aria-label="Additional information">
              {rightRail}
            </aside>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
