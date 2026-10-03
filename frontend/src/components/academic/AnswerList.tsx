'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { answersApi } from '@/lib/api/answers';
import { Button } from '@/components/ui/Button';
import { AcceptedAnswerBadge } from './AcceptedAnswerBadge';
import { VotePill } from './VotePill';
import type { Answer, Discussion } from '@/types';
import styles from './AnswerList.module.css';

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

  const load = useCallback(async () => {
    try {
      setAnswers(await answersApi.list(post.id));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được câu trả lời.');
    }
  }, [post.id]);

  useEffect(() => { void load(); }, [load, version]);

  async function accept(answer: Answer) {
    if (!post.contentVersion) return;
    setBusyId(answer.id);
    try {
      await answersApi.accept(post.id, {
        answerId: answer.id,
        expectedQuestionVersion: post.contentVersion,
        expectedAnswerVersion: answer.contentVersion,
      });
      await Promise.all([load(), onChange()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể chấp nhận câu trả lời.');
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
            <VotePill
              targetType="answer"
              targetId={answer.id}
              upvoteCount={answer.upvoteCount}
              downvoteCount={answer.downvoteCount}
              myVote={answer.myVote}
              disabled={!answer.canVote || post.status === 'closed'}
            />
            <header className={styles.header}>
              <div className={styles.badges}>
                {accepted && <AcceptedAnswerBadge />}
              </div>
              <time dateTime={answer.createdAt}>{new Date(answer.createdAt).toLocaleString('vi-VN')}</time>
            </header>
            <div className={styles.content}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer.content}</ReactMarkdown>
            </div>
            {answer.canAcceptAnswer && !accepted && post.status !== 'closed' && (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === answer.id}
                onClick={() => void accept(answer)}
              >
                Chấp nhận câu trả lời
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}
