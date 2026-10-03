import { apiGet, apiPatch } from './client';

export interface PendingContent {
  id: string;
  entityType: 'discussion';
  title: string | null;
  content: string;
  contentVersion: number;
  createdAt: string;
}
export const moderationApi = {
  pending: () => apiGet<{ data: PendingContent[] }>('/api/moderation/pending', true),
  review: (item: PendingContent, decision: 'allow' | 'hide', note: string) =>
    apiPatch(`/api/moderation/${item.entityType}/${item.id}`, {
      decision, expectedVersion: item.contentVersion, expectedContent: item.content, note,
    }),
};
