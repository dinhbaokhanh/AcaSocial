"use client";
import { useState } from 'react';
import { apiPost } from '@/lib/api/client';

export function ReportPost({ id, version }: { id: string; version: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <div>
    <button type="button" onClick={() => setOpen(!open)}>Báo cáo vi phạm</button>
    {open && <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage('');
      try { await apiPost('/api/content-reports', { entityType: 'discussion', entityId: id, contentVersion: version, reasonCode: reason, details }, true); setMessage('Đã tiếp nhận báo cáo.'); setOpen(false); }
      catch (e) { setMessage(e instanceof Error ? e.message : 'Gửi báo cáo thất bại'); }
      finally { setBusy(false); }
    }}>
      <label>Lý do <select value={reason} onChange={e => setReason(e.target.value)}>
        {Object.entries({ spam: 'Spam', harassment: 'Quấy rối', hate: 'Công kích thù ghét', threat: 'Đe dọa', privacy: 'Lộ thông tin riêng tư', other: 'Khác' }).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select></label>
      <label>Mô tả thêm <textarea maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} /></label>
      <button disabled={busy} type="submit">{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </div>;
}
