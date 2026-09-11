import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type { Tag, PaginatedResponse } from "@/types";

export const tagsApi = {
  create: (data: { name: string; description: string }) =>
    apiPost<Tag>("/api/tags", data, true),
  update: (id: string, data: { name: string; description: string }) =>
    apiPatch<Tag>(`/api/tags/${id}`, data),
  remove: (id: string) => apiDelete<{ message: string }>(`/api/tags/${id}`),
  list: (page = 1, limit = 50, search?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) q.set("search", search);
    return apiGet<PaginatedResponse<Tag>>(`/api/tags?${q.toString()}`);
  },

  get: (id: string) => apiGet<Tag>(`/api/tags/${id}`),
};
