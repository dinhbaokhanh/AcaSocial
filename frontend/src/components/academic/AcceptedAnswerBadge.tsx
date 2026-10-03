import styles from './AcceptedAnswerBadge.module.css';

interface AcceptedAnswerBadgeProps {
  /** Show in compact mode (just icon, no text) */
  compact?: boolean;
}

export function AcceptedAnswerBadge({ compact = false }: AcceptedAnswerBadgeProps) {
  return (
    <span className={styles.badge} title="Lời giải được chọn" aria-label="Lời giải được chọn">
      <svg
        className={styles.icon}
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 7l3.5 3.5L12 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && <span>Lời giải được chọn</span>}
    </span>
  );
}
