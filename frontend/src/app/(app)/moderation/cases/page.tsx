"use client";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';

interface Case {
  id: string; entity_id: string; content_version: number; current_version: number;
  title: string; content: string; report_count: number; status: string; ai_state: string;
  analyzed_title: string; analyzed_content: string;
  moderation_status: string; pending_revision?: { content: string };
  reports: { reason: string; details: string }[] | null;
  ai_result?: { recommendedAction: string; status: string; categories: { code: string; explanation: string; evidence: string }[] };
}
export default function CasesPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setItems(await apiGet<Case[]>(`/api/moderation/cases?status=${status}&page=${page}${reason ? `&reason=${reason}` : ''}`, true)); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Không tải được hồ sơ'); }
  }, [status, page, reason]);
  useEffect(() => { void load(); }, [load]);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setMessage('');
    try { await fn(); await load(); } catch(e) { setMessage(e instanceof Error ? e.message : 'Thao tác thất bại'); }
    finally { setBusy(false); }
  }
  return <main><Link href="/moderation">← Kiểm duyệt bài</Link><h1>Hồ sơ báo cáo vi phạm</h1>
    <label>Trạng thái <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
      <option value="open">Chưa nhận</option><option value="claimed">Đã nhận</option><option value="resolved">Đã xử lý</option>
    </select></label> <button onClick={() => void load()}>Tải lại</button>
    <label> Lý do <select value={reason} onChange={e => { setReason(e.target.value); setPage(1); }}>
      <option value="">Tất cả</option>{['spam','harassment','hate','threat','privacy','other'].map(r => <option key={r}>{r}</option>)}
    </select></label>
    <button disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>Trang trước</button>
    <span> Trang {page} </span><button disabled={items.length < 30 || busy} onClick={() => setPage(page + 1)}>Trang sau</button>
    {message && <p role="alert">{message}</p>}
    {items.length === 0 && <p>Không có hồ sơ trong danh sách này.</p>}
    {items.map(c => <article key={c.id} style={{ border: '1px solid #ccc', padding: 20, marginTop: 16 }}>
      <h2><Link href={`/posts/${c.entity_id}`}>{c.title}</Link></h2>
      <p>{c.report_count} báo cáo · Bản được báo cáo: {c.content_version} · Bản hiện tại: {c.current_version}</p>
      <details><summary>Nội dung được báo cáo</summary><p style={{ whiteSpace: 'pre-wrap' }}>{c.analyzed_title}\n{c.analyzed_content}</p></details>
      <ul>{c.reports?.map((r,i) => <li key={i}>{r.reason}: {r.details}</li>)}</ul>
      <p>Phân tích AI: {c.ai_state ?? 'Chưa có'}</p>
      {c.current_version !== c.content_version ? <p>Nội dung đã thay đổi; không dùng kết quả cũ để duyệt bản mới.</p> : c.ai_state === 'succeeded' && c.ai_result && <div>
        <p>Gợi ý: {c.ai_result.recommendedAction} ({c.ai_result.status}). Người kiểm duyệt quyết định.</p>
        <ul>{c.ai_result.categories.map((x,i) => <li key={i}>{x.code}: {x.explanation}<blockquote>{x.evidence}</blockquote></li>)}</ul>
      </div>}
      {c.status === 'open' && <button disabled={busy} onClick={() => void act(() => apiPost(`/api/moderation/cases/${c.id}/claim`, {}, true))}>Nhận xử lý</button>}
      {c.status !== 'resolved' && c.current_version === c.content_version && <div>
        {(['allow','hide'] as const).map(decision => <button key={decision} disabled={busy} onClick={() => {
          const note = window.prompt('Ghi lý do quyết định kiểm duyệt:');
          if (!note?.trim()) return;
          void act(() => apiPatch(`/api/moderation/discussion/${c.entity_id}`, { decision, expectedVersion: c.current_version,
            expectedModerationStatus: c.moderation_status, expectedContent: c.pending_revision?.content ?? c.content, note }));
        }}>{decision === 'allow' ? 'Duyệt bài' : 'Ẩn / từ chối'}</button>)}
      </div>}
    </article>)}
  </main>;
}
