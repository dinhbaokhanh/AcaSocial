// Application-wide constants

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// -------------------------------------------------------------------------
// Route paths
// -------------------------------------------------------------------------
export const ROUTES = {
  // Auth
  LOGIN:           '/login',
  REGISTER:        '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Main
  HOME:       '/',
  QUESTIONS:  '/questions',
  DISCUSSIONS:'/discussions',
  TAGS:       '/tags',
  TAG:        (slug: string) => `/tags/${slug}`,

  // Posts
  POST:        (id: string) => `/posts/${id}`,
  POST_CREATE: '/posts/create',
  POST_EDIT:   (id: string) => `/posts/${id}/edit`,

  // Profile
  PROFILE:          '/profile',
  PROFILE_SETTINGS: '/profile/settings',
  USER_PROFILE:     (username: string) => `/users/${username}`,
} as const;

// -------------------------------------------------------------------------
// Pagination
// -------------------------------------------------------------------------
export const DEFAULT_PAGE_SIZE = 15;
export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

// -------------------------------------------------------------------------
// Discussion filters
// -------------------------------------------------------------------------
export const SORT_OPTIONS = [
  { value: 'newest',        label: 'Mới nhất' },
  { value: 'oldest',        label: 'Cũ nhất' },
  { value: 'most_votes',    label: 'Nhiều bình chọn nhất' },
  { value: 'most_comments', label: 'Nhiều bình luận nhất' },
] as const;

export const POST_TYPE_OPTIONS = [
  { value: '',           label: 'Tất cả bài đăng' },
  { value: 'question',   label: 'Câu hỏi' },
  { value: 'discussion', label: 'Thảo luận' },
] as const;

export const POST_STATUS_OPTIONS = [
  { value: '',         label: 'Tất cả trạng thái' },
  { value: 'open',     label: 'Đang mở' },
  { value: 'solved',   label: 'Đã có lời giải' },
  { value: 'closed',   label: 'Đã đóng' },
] as const;

// -------------------------------------------------------------------------
// User roles
// -------------------------------------------------------------------------
export const ROLE_LABELS: Record<string, string> = {
  student:   'Sinh viên',
  teacher:   'Giảng viên',
  moderator: 'Kiểm duyệt viên',
  admin:     'Quản trị viên',
};

// -------------------------------------------------------------------------
// Local storage / cookie keys
// -------------------------------------------------------------------------
export const TOKEN_KEY         = 'sn_access_token';
export const REFRESH_TOKEN_KEY = 'sn_refresh_token';

// -------------------------------------------------------------------------
// Misc
// -------------------------------------------------------------------------
export const SITE_NAME        = 'AcaSocial';
export const SITE_DESCRIPTION = 'Mạng xã hội học thuật dành cho sinh viên và giảng viên.';
export const MAX_TITLE_LENGTH = 300;
export const MAX_TAG_COUNT    = 5;
export const MIN_TAG_COUNT    = 1;

export const ROOM_TYPE_LABELS = {
  major: 'Ngành học', course: 'Môn học', event: 'Sự kiện', forum: 'Trao đổi chung',
} as const;
