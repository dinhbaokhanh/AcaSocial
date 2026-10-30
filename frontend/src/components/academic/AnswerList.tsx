'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { answersApi } from '@/lib/api/answers';
import { useToast } from '@/lib/toast/context';
import { Button } from '@/components/ui/Button';
import { AcceptedAnswerBadge } from './AcceptedAnswerBadge';
import { AuthorChip } from './AuthorChip';
import { VotePill } from './VotePill';
import type { Answer, Discussion } from '@/types';
import styles from './AnswerList.module.css';
import markdownStyles from '@/components/shared/Markdown.module.css';

export function AnswerList({
  post,
  version,
  onChange,
}: {
  post: Discussion;
  version: number;
  onChange: () => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  // `version` tăng mỗi khi trang gọi refresh (kể cả qua onChange), nên effect này lo việc tải lại.
  useEffect(() => {
    let active = true;
    answersApi
      .list(post.id)
      .then((list) => {
        if (active) { setAnswers(list); setError(''); }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được câu trả lời.');
      });
    return () => { active = false; };
  }, [post.id, version]);

  async function accept(answer: Answer) {
    if (!post.contentVersion) return;
    setBusyId(answer.id);
    try {
      await answersApi.accept(post.id, {
        answerId: answer.id,
        expectedQuestionVersion: post.contentVersion,
        expectedAnswerVersion: answer.contentVersion,
      });
      await onChange();
    } catch (cause) {
      toast.error('Không thể chọn lời giải', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  if (!answers.length && !error) return <p className={styles.empty}>Chưa có câu trả lời.</p>;

  return (
    <div className={styles.list}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {answers.map((answer) => {
        const accepted = post.acceptedAnswerId === answer.id;
        return (
          <article className={accepted ? `${styles.answer} ${styles.accepted}` : styles.answer} key={answer.id}>
            <div className={styles.voteColumn}>
              <VotePill
                targetType="answer"
                targetId={answer.id}
                upvoteCount={answer.upvoteCount}
                downvoteCount={answer.downvoteCount}
                myVote={answer.myVote}
                disabled={!answer.canVote || post.status === 'closed'}
              />
            </div>
            <div className={styles.body}>
              <header className={styles.header}>
                <AuthorChip
                  author={answer.author}
                  isAnonymous={answer.isAnonymous}
                  isMine={answer.isMine}
                  seed={answer.anonymousKey ?? answer.id}
                  anonymousNumber={answer.anonymousNumber}
                />
                <span aria-hidden="true">·</span>
                <time dateTime={answer.createdAt}>{new Date(answer.createdAt).toLocaleString('vi-VN')}</time>
                {accepted && <AcceptedAnswerBadge />}
              </header>
              <div className={`${styles.content} ${markdownStyles.markdownBody}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer.content}</ReactMarkdown>
              </div>
              {answer.canAcceptAnswer && !accepted && post.status !== 'closed' && (
                <div className={styles.actions}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === answer.id}
                    onClick={() => void accept(answer)}
                  >
                    Chọn làm lời giải
                  </Button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
