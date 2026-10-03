import { apiGet, apiPatch } from './client';
import type { PaginatedResponse, Role, User } from '@/types';
export interface RoleAudit { id: string; oldRole: Role; newRole: Role; reason: string; changedBy: string; createdAt: string; }
export const adminApi = {
  users: () => apiGet<PaginatedResponse<User>>('/api/admin/users?limit=100'),
  changeRole: (id: string, role: Role, reason: string) => apiPatch<User>(`/api/admin/users/${id}/role`, { role, reason }),
  audits: (id: string) => apiGet<RoleAudit[]>(`/api/admin/users/${id}/role-audits`),
};
