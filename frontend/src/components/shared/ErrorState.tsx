import { Button } from '@/components/ui/Button';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message = 'Đã xảy ra lỗi. Vui lòng thử lại.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={styles.wrap} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="16" stroke="var(--color-destructive-300)" strokeWidth="2" />
          <path d="M18 11v8M18 24v1" stroke="var(--color-destructive-500)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
