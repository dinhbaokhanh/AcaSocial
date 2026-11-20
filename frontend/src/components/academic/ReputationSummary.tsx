'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gamificationApi, type ReputationSummary as Summary } from '@/lib/api/gamification';
export function ReputationSummary({ userId }: { userId: string }) { return <SessionSummary key={userId} />; }
function SessionSummary() {
  const [value, setValue] = useState<Summary | null>(null), [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => { void gamificationApi.me().then(v => { if (active) { setValue(v); setError(false); } }).catch(() => { if (active) setError(true); }); };
    load(); const timer = setInterval(load, 10000); return () => { active = false; clearInterval(timer); };
  }, []);
  return <Link href="/reputation" aria-label="Xem điểm uy tín và huy hiệu"><strong>{error ? 'Chưa tải được' : value?.totalScore ?? 'Đang tải…'}</strong>{value?.updating && <small> · Đang cập nhật</small>}</Link>;
}
