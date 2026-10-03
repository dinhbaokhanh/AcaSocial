'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { adminApi } from '@/lib/api/admin';
import type { Role, User } from '@/types';
import { Button } from '@/components/ui/Button';
const roles: Role[] = ['student','teacher','moderator','admin'];
export default function AdminUsersPage() {
  const { user: actor } = useAuth(); const [users, setUsers] = useState<User[]>([]); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setUsers((await adminApi.users()).data); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được user'); } }, []);
  useEffect(() => { if (actor?.role === 'admin') void load(); }, [actor, load]);
  if (actor?.role !== 'admin') return <p>Bạn không có quyền truy cập.</p>;
  async function change(user: User, role: Role) { if (role === user.role) return; const reason = window.prompt('Lý do thay đổi quyền (bắt buộc):', '')?.trim(); if (!reason || reason.length < 5) return; try { await adminApi.changeRole(user.id, role, reason); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Không đổi được quyền'); } }
  return <section><h1>Quản lý quyền người dùng</h1>{error && <p role="alert">{error}</p>}<div style={{display:'grid',gap:10}}>{users.map((user) => <article key={user.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,border:'1px solid var(--color-outline)',padding:12,borderRadius:10}}><div><strong>{user.fullName}</strong><div>{user.email}</div></div><select value={user.role} disabled={user.id === actor.id} onChange={(e) => void change(user, e.target.value as Role)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></article>)}</div><Button variant="ghost" onClick={() => void load()}>Tải lại</Button></section>;
}
