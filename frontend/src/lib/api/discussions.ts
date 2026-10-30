import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
  Discussion,
  PaginatedResponse,
  DiscussionFilterParams,
  CreateDiscussionPayload,
  UpdateDiscussionPayload,
  TagSuggestionResponse,
} from '@/types';

function buildQuery(params: DiscussionFilterParams): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value));
    }
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

export const discussionsApi = {
  list: (params: DiscussionFilterParams = {}) =>
    apiGet<PaginatedResponse<Discussion>>(
      `/api/discussions${buildQuery(params)}`,
    ),

  get: (id: string) =>
    apiGet<Discussion>(`/api/discussions/${id}`),

  create: (data: CreateDiscussionPayload) =>
    apiPost<Discussion>('/api/discussions', data, true),

  suggestTags: (data: { title: string; content: string }) =>
    apiPost<TagSuggestionResponse>('/api/discussions/tag-suggestions', data, true),

  update: (id: string, data: UpdateDiscussionPayload) =>
    apiPatch<Discussion>(`/api/discussions/${id}`, data),

  remove: (id: string) =>
    apiDelete<{ message: string }>(`/api/discussions/${id}`),

  acceptAnswer: (discussionId: string, commentId: string) =>
    apiPatch<Discussion>(`/api/discussions/${discussionId}/accept`, { commentId }),

  removeAcceptedAnswer: (discussionId: string) =>
    apiDelete<Discussion>(`/api/discussions/${discussionId}/accept`),
};
