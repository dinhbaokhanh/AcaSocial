import { API_BASE_URL } from '@/lib/constants';
import type { ApiError } from '@/types';

const ERROR_MESSAGES: Record<string, string> = {
  'Email already registered': 'Email này đã được đăng ký.',
  'User not found': 'Không tìm thấy tài khoản.',
  'Account already verified': 'Tài khoản đã được xác minh.',
  'Username already taken': 'Tên đăng nhập đã được sử dụng.',
  'Invalid or expired OTP': 'Mã xác minh không hợp lệ hoặc đã hết hạn.',
  'Invalid credentials': 'Tên đăng nhập, email hoặc mật khẩu không đúng.',
  'Account not verified': 'Bạn cần xác minh email trước khi đăng nhập.',
  'Invalid or expired refresh token': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Authentication required': 'Vui lòng đăng nhập để tiếp tục.',
  'Admin or moderator role required': 'Chỉ quản trị viên hoặc kiểm duyệt viên có quyền thực hiện.',
  'Post awaits approval': 'Bài đăng đang chờ duyệt.',
  'Content changed; reload before reviewing': 'Bài đăng đã thay đổi. Vui lòng tải lại trước khi duyệt.',
};

function displayError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

// --------------------------------------------------------------------------
// Custom error class for API failures
// --------------------------------------------------------------------------
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(
      Array.isArray(body.message)
        ? body.message.map(displayError).join(', ')
        : displayError(body.message),
    );
    this.name = 'ApiRequestError';
  }
}

// --------------------------------------------------------------------------
// Token management (in-memory + localStorage mirror for client components)
// --------------------------------------------------------------------------
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('sn_access_token', token);
    else localStorage.removeItem('sn_access_token');
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window !== 'undefined') {
    _accessToken = localStorage.getItem('sn_access_token');
  }
  return _accessToken;
}

export function setRefreshToken(token: string | null): void {
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('sn_refresh_token', token);
    else localStorage.removeItem('sn_refresh_token');
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sn_refresh_token');
  }
  return null;
}

export function clearTokens(): void {
  setAccessToken(null);
  setRefreshToken(null);
}

// --------------------------------------------------------------------------
// Refresh token flow — called automatically on 401
// --------------------------------------------------------------------------
let _isRefreshing = false;
let _pendingQueue: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data.accessToken;
}

// --------------------------------------------------------------------------
// Core fetch wrapper
// --------------------------------------------------------------------------
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean; isRetry?: boolean } = {},
): Promise<T> {
  const { auth = false, isRetry = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers as HeadersInit);
  headers.set('Content-Type', 'application/json');

  if (auth || getAccessToken()) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && !isRetry) {
    if (_isRefreshing) {
      // Queue concurrent requests
      return new Promise<T>((resolve, reject) => {
        _pendingQueue.push((newToken) => {
          if (!newToken) {
            reject(new ApiRequestError(401, { statusCode: 401, message: 'Vui lòng đăng nhập để tiếp tục.' }));
          } else {
            apiFetch<T>(path, { ...options, isRetry: true }).then(resolve).catch(reject);
          }
        });
      });
    }

    _isRefreshing = true;
    const newToken = await refreshAccessToken();
    _isRefreshing = false;

    const queue = _pendingQueue;
    _pendingQueue = [];
    queue.forEach((cb) => cb(newToken));

    if (!newToken) {
      throw new ApiRequestError(401, { statusCode: 401, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    return apiFetch<T>(path, { ...options, isRetry: true });
  }

  if (!response.ok) {
    let body: ApiError;
    try {
      body = await response.json();
    } catch {
      body = { statusCode: response.status, message: response.statusText };
    }
    throw new ApiRequestError(response.status, body);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// --------------------------------------------------------------------------
// Convenience helpers
// --------------------------------------------------------------------------
export const apiGet = <T>(path: string, auth = false) =>
  apiFetch<T>(path, { method: 'GET', auth });

export const apiPost = <T>(path: string, body: unknown, auth = false) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), auth });

export const apiPatch = <T>(path: string, body: unknown, auth = true) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body), auth });

export const apiDelete = <T>(path: string, auth = true) =>
  apiFetch<T>(path, { method: 'DELETE', auth });
