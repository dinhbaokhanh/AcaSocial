'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth/context';
import { moderationApi, type PendingContent } from '@/lib/api/moderation';

export default function ModerationPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingContent[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await moderationApi.pending()).data); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được nội dung'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user && ['admin', 'moderator'].includes(user.role)) void load(); }, [user?.role, load]);
  if (!user || !['admin', 'moderator'].includes(user.role)) return <p>Chỉ admin và moderator có quyền duyệt bài đăng.</p>;
  async function review(item: PendingContent, decision: 'allow' | 'hide') {
    const note = window.prompt(decision === 'allow' ? 'Ghi chú duyệt (không bắt buộc)' : 'Lý do từ chối');
    if (note === null) return;
    setBusy(true);
    try { await moderationApi.review(item, decision, note); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể duyệt nội dung'); }
    finally { setBusy(false); }
  }
  const labels = { discussion: 'Bài viết', answer: 'Câu trả lời', comment: 'Bình luận' };
  return <section>
    <h1>Duyệt bài đăng</h1>
    <p>Bài đăng chỉ hiển thị công khai sau khi admin hoặc moderator duyệt.</p>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy || loading} onClick={() => void load()}>Tải lại</button>
    {loading ? <p>Đang tải…</p> : !items.length && !error && <p>Không có nội dung chờ duyệt.</p>}
    {items.map(item => <article key={`${item.entityType}:${item.id}`} style={{ padding: '20px 0', borderBottom: '1px solid var(--color-border)' }}>
      <small>{labels[item.entityType]} · {new Date(item.createdAt).toLocaleString('vi-VN')}</small>
      {item.title && <h2>{item.title}</h2>}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
      <button disabled={busy} onClick={() => void review(item, 'allow')}>Duyệt</button>{' '}
      <button disabled={busy} onClick={() => void review(item, 'hide')}>Từ chối</button>
    </article>)}
  </section>;
}
