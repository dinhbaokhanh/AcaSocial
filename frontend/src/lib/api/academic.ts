import { apiGet, apiPost, apiPatch } from './client';
import type { MajorCourse, PaginatedResponse } from '@/types';
export interface CatalogItem { id: string; code: string | null; name: string; description: string; status: 'active' | 'inactive'; metadataVersion: number; }
export const academicApi = {
  courses: (page = 1) => apiGet<PaginatedResponse<CatalogItem>>(`/api/courses?page=${page}&limit=20`, true),
  majors: async () => {
    const rows: CatalogItem[] = [];
    for (let page = 1; ; page++) {
      const response = await apiGet<PaginatedResponse<CatalogItem>>(`/api/majors?page=${page}&limit=100`, true);
      rows.push(...response.data);
      if (page >= response.meta.totalPages) return rows;
    }
  },
  createCourse: (body: { code: string; name: string; description: string }) => apiPost<CatalogItem>('/api/courses', body, true),
  updateCourse: (id: string, body: { name: string; description: string; expectedVersion: number }) => apiPatch<CatalogItem>(`/api/courses/${id}`, body),
  addMajorCourse: (body: { courseId: string; majorId: string; courseType: 'required' | 'elective'; credits?: number; recommendedSemester?: number }) => apiPost<MajorCourse>('/api/major-courses', body, true),
  majorCourses: (majorId: string) => apiGet<MajorCourse[]>(`/api/majors/${majorId}/courses`),
};
