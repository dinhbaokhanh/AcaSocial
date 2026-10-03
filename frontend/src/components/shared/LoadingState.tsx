import { Spinner } from '@/components/ui/Spinner'
import styles from './LoadingState.module.css'

interface LoadingStateProps {
  label?: string
  /** Render skeleton cards instead of spinner */
  variant?: 'spinner' | 'feed' | 'card'
  count?: number
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonVote} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonMeta} />
      </div>
    </div>
  )
}

export function LoadingState({
  label = 'Đang tải…',
  variant = 'spinner',
  count = 5,
}: LoadingStateProps) {
  if (variant === 'feed' || variant === 'card') {
    return (
      <div className={styles.skeletonList} role="status" aria-label={label}>
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.spinnerWrap} role="status" aria-label={label}>
      <Spinner size="lg" />
    </div>
  )
}
