'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { gamificationApi, type ReputationSummary, type CourseScore, type LedgerEntry, type UserBadge } from '@/lib/api/gamification';
import { apiGet } from '@/lib/api/client';
import type { PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import styles from '../admin/CatalogAdmin.module.css';
export function ReputationPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Đang kiểm tra phiên đăng nhập…</p>;
  if (!user) return <p>Vui lòng đăng nhập để xem điểm uy tín.</p>;
  return <SessionReputation key={user.id} />;
}
function SessionReputation() {
  const [summary, setSummary] = useState<ReputationSummary | null>(null), [error, setError] = useState('');
  const [tab, setTab] = useState<'courses' | 'ledger' | 'badges'>('courses'), [page, setPage] = useState(1), [pages, setPages] = useState(1);
  const [courses, setCourses] = useState<CourseScore[]>([]), [ledger, setLedger] = useState<LedgerEntry[]>([]), [badges, setBadges] = useState<UserBadge[]>([]);
  const [names, setNames] = useState<Record<string, string>>({}), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  const [definitions, setDefinitions] = useState<{ code: string; threshold: number }[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [s, data, defs] = await Promise.all([gamificationApi.me(), gamificationApi[tab](page), gamificationApi.definitions()]);
        if (!active) return;
        setSummary(s); setDefinitions(defs); setPages(Math.max(1, data.meta.totalPages));
        if (tab === 'courses') setCourses(data.data as CourseScore[]);
        if (tab === 'ledger') setLedger(data.data as LedgerEntry[]);
        if (tab === 'badges') setBadges(data.data as UserBadge[]);
        setError('');
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Không tải được điểm uy tín'); }
      finally { if (active) setLoading(false); }
    };
    void load(); const timer = setInterval(() => void load(), 10000); return () => { active = false; clearInterval(timer); };
  }, [tab, page, retry]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const result: Record<string, string> = {};
      for (let page = 1; ; page++) {
        const response = await apiGet<PaginatedResponse<{ id: string; name: string }>>(`/api/courses?page=${page}&limit=100`);
        for (const c of response.data) result[c.id] = c.name;
        if (page >= response.meta.totalPages) break;
      }
      if (active) setNames(result);
    };
    void load().catch(() => {}); return () => { active = false; };
  }, []);
  const scope = (id: string) => id === 'general' ? 'Đóng góp chung' : id === 'total' ? 'Tổng đóng góp' : names[id] ?? `Môn ${id}`;
  const selectTab = (next: typeof tab) => {
    if (next === tab && page === 1) return;
    setLoading(true);
    setPage(1);
    setTab(next);
  };
  return <section className={styles.page}><h1>Điểm uy tín và huy hiệu</h1>
    <p>Ghi nhận đóng góp cộng đồng; không thay thế xác thực kiến thức của giảng viên. Dữ liệu này chỉ dành cho tài khoản của bạn.</p>
    {error && <p role="alert">{error} <button onClick={() => setRetry(v => v + 1)}>Thử lại</button></p>}
    {summary && <div className={styles.notice}><h2>{summary.totalScore} điểm</h2><p>Đóng góp chung: {summary.generalScore} · Tích lũy từ {new Date(summary.startedAt).toLocaleDateString('vi-VN')}</p>{summary.updating && <p role="status">Đang xử lý đóng góp mới…</p>}</div>}
    <p>Mốc huy hiệu: {definitions.map(d => `${d.code}: ${d.threshold}`).join(' · ')}. Điểm bị thu hồi khi đóng góp không còn đủ điều kiện.</p>
    <nav className={styles.actions} aria-label="Loại thông tin uy tín">{([['courses', 'Theo môn học'], ['ledger', 'Lịch sử điểm'], ['badges', 'Huy hiệu']] as const).map(([key, label]) => <Button key={key} variant={tab === key ? 'primary' : 'outline'} onClick={() => selectTab(key)}>{label}</Button>)}</nav>
    {loading ? <p>Đang tải…</p> : <div className={styles.list}>
      {tab === 'courses' && (courses.length ? courses.map(c => <article key={c.course_id} className={styles.item}><strong>{scope(c.course_id)}</strong><span>{c.score} điểm</span></article>) : <p>Chưa có điểm theo môn.</p>)}
      {tab === 'ledger' && (ledger.length ? ledger.map(row => <article key={row.id} className={styles.item}><div><strong>{row.delta > 0 ? '+' : ''}{row.delta} điểm · {scope(row.scope)}</strong><p>{row.reason === 'revoked' ? 'Thu hồi do đóng góp không còn đủ điều kiện' : 'Đóng góp hợp lệ được ghi nhận'}</p><small>{new Date(row.created_at).toLocaleString('vi-VN')} · Quy tắc v{row.rule_version}</small></div></article>) : <p>Chưa có biến động điểm.</p>)}
      {tab === 'badges' && (badges.length ? badges.map(b => <article key={`${b.scope}:${b.badge_code}`} className={styles.item}><div><strong>{b.badge_code} · {scope(b.scope)}</strong><p>{b.active ? 'Đang đạt' : 'Không còn đủ ngưỡng; lịch sử được giữ lại'}</p></div></article>) : <p>Chưa đạt huy hiệu.</p>)}
    </div>}
    <div className={styles.actions}><Button variant="ghost" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Trước</Button><span>Trang {page}/{pages}</span><Button variant="ghost" disabled={loading || page >= pages} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Sau</Button></div>
  </section>;
}
