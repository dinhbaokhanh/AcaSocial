import { apiGet } from './client';
import type { MajorCourse } from '@/types';

export const academicApi = {
  /** Các môn của một ngành, theo thứ tự hiển thị trong chương trình. */
  majorCourses: (majorId: string) =>
    apiGet<MajorCourse[]>(`/api/majors/${majorId}/courses`),
};
