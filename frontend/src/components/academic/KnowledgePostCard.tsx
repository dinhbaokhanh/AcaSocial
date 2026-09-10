import Link from 'next/link';
import type { Discussion } from '@/types';
import { ROUTES } from '@/lib/constants';
import { VotePill } from './VotePill';
import { TopicChip } from './TopicChip';
import { StatusBadge } from './StatusBadge';
import { AcceptedAnswerBadge } from './AcceptedAnswerBadge';
import { Avatar } from '@/components/ui/Avatar';
import { FacultyBadge } from './FacultyBadge';
import styles from './KnowledgePostCard.module.css';

export type PostCardVariant = 'default' | 'compact' | 'solved' | 'featured';

interface KnowledgePostCardProps {
  discussion: Discussion;
  variant?: PostCardVariant;
  /** Whether the current user is authenticated (for vote interaction) */
  isAuthenticated?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60)   return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)     return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30)      return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12)    return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function KnowledgePostCard({
  discussion,
  variant = 'default',
  isAuthenticated = false,
}: KnowledgePostCardProps) {
  const {
    id,
    title,
    postType,
    status,
    upvoteCount,
    downvoteCount,
    commentCount,
    viewCount,
    acceptedCommentId,
    tags,
    createdAt,
    author,
    isAnonymous,
    myVote,
  } = discussion;

  const isResolved = status === 'solved' || acceptedCommentId !== null;
  const isCompact  = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <article
      className={[
        styles.card,
        isResolved ? styles.solved : '',
        isFeatured ? styles.featured : '',
        isCompact  ? styles.compact  : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Vote + answer count column */}
      {!isCompact && (
        <div className={styles.voteCol}>
          <VotePill
            targetType="discussion"
            targetId={id}
            upvoteCount={upvoteCount}
            downvoteCount={downvoteCount}
            myVote={myVote}
            orientation="vertical"
            disabled={!isAuthenticated}
          />
          <div
            className={[styles.answerCount, isResolved ? styles.answerCountResolved : '']
              .filter(Boolean)
              .join(' ')}
            title={`${commentCount} answer${commentCount !== 1 ? 's' : ''}`}
          >
            <span className={styles.answerNum}>{commentCount}</span>
            <span className={styles.answerLabel}>ans</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={styles.content}>

        {/* Type + status badges */}
        <div className={styles.headerRow}>
          <span className={[
            styles.typeBadge,
            postType === 'question' ? styles.typeQuestion : styles.typeDiscussion,
          ].join(' ')}>
            {postType === 'question' ? (
              <>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 6.5V6c0-.5.5-1 1-1.5a1.5 1.5 0 10-2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="5" cy="8" r=".5" fill="currentColor"/>
                </svg>
                Question
              </>
            ) : (
              <>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M1 1.5h8a.5.5 0 01.5.5v5a.5.5 0 01-.5.5H3L1 9V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                Discussion
              </>
            )}
          </span>

          {isResolved && acceptedCommentId && <AcceptedAnswerBadge compact />}
          <StatusBadge status={status} />
        </div>

        {/* Title */}
        <h2 className={[styles.title, isFeatured ? styles.titleFeatured : ''].filter(Boolean).join(' ')}>
          <Link href={ROUTES.POST(id)} className={styles.titleLink}>
            {title}
          </Link>
        </h2>

        {/* Tags */}
        {tags.length > 0 && (
          <div className={styles.tags} aria-label="Topics">
            {tags.slice(0, 4).map((tag) => (
              <TopicChip key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        )}

        {/* Meta: author · time · views */}
        <div className={styles.meta}>
          {!isAnonymous && author ? (
            <div className={styles.author}>
              <Avatar src={author.avatarUrl} alt={author.fullName} size="xs" />
              <Link href={ROUTES.USER_PROFILE(author.username)} className={styles.authorName}>
                {author.fullName}
              </Link>
              <FacultyBadge role={author.role} size="sm" />
            </div>
          ) : (
            <span className={styles.anonymous}>Anonymous</span>
          )}

          <span className={styles.metaDot} aria-hidden="true">·</span>
          <time className={styles.time} dateTime={createdAt} title={new Date(createdAt).toLocaleString()}>
            {formatRelativeTime(createdAt)}
          </time>

          {!isCompact && (
            <>
              <span className={styles.metaDot} aria-hidden="true">·</span>
              <span className={styles.views} title={`${viewCount.toLocaleString()} views`}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
                </svg>
                {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
