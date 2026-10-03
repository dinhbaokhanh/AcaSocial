import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { Answer } from '@/types';

export const answersApi = {
  list: (discussionId: string) =>
    apiGet<Answer[]>(`/api/discussions/${discussionId}/answers`),
  create: (discussionId: string, data: { content: string; isAnonymous?: boolean }) =>
    apiPost<Answer>(`/api/discussions/${discussionId}/answers`, data, true),
  update: (
    id: string,
    data: { content: string; expectedVersion: number; revisionType: 'editorial' | 'semantic' },
  ) => apiPatch<Answer>(`/api/answers/${id}`, data),
  remove: (id: string) => apiDelete<{ message: string }>(`/api/answers/${id}`),
  accept: (
    discussionId: string,
    data: { answerId: string; expectedQuestionVersion: number; expectedAnswerVersion: number },
  ) => apiPatch<Answer>(`/api/discussions/${discussionId}/accepted-answer`, data),
  revokeAcceptance: (discussionId: string) =>
    apiDelete<{ message: string }>(`/api/discussions/${discussionId}/accepted-answer`),
  vote: (id: string, voteType: 'upvote' | 'downvote') =>
    apiPost<{ upvoteCount: number; downvoteCount: number }>(`/api/answers/${id}/vote`, { voteType }),
  removeVote: (id: string) => apiDelete<{ upvoteCount: number; downvoteCount: number }>(`/api/answers/${id}/vote`),
};
