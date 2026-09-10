// ==========================================================================
// AcaSocial — Shared TypeScript Types
// Mirrors backend data models exactly.
// ==========================================================================

// --------------------------------------------------------------------------
// Enums
// --------------------------------------------------------------------------

export type Role = 'student' | 'teacher' | 'moderator' | 'admin';
export type Privacy = 'public' | 'private';
export type PostType = 'question' | 'discussion';
export type PostStatus = 'open' | 'solved' | 'closed';
export type VoteType = 'upvote' | 'downvote';
export type TargetType = 'discussion' | 'comment';
export type SortBy = 'newest' | 'oldest' | 'most_votes' | 'most_comments';

// --------------------------------------------------------------------------
// User
// --------------------------------------------------------------------------

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  privacy: Privacy;
  isVerified: boolean;
  role: Role;
  dateOfBirth: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Lightweight user reference (populated by frontend when joining author data)
export interface UserRef {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
}

// --------------------------------------------------------------------------
// Tag
// --------------------------------------------------------------------------

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  usageCount: number;
  createdAt: string;
}

// --------------------------------------------------------------------------
// Discussion (Post)
// --------------------------------------------------------------------------

export interface Discussion {
  id: string;
  title: string;
  content: string;
  postType: PostType;
  status: PostStatus;
  authorId: string;
  isAnonymous: boolean;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  viewCount: number;
  acceptedCommentId: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  // Joined author info (populated by frontend)
  author?: UserRef;
  // Current user's vote (populated when authenticated)
  myVote?: VoteType | null;
}

// --------------------------------------------------------------------------
// Comment (Answer)
// --------------------------------------------------------------------------

export interface Comment {
  id: string;
  discussionId: string;
  authorId: string;
  content: string;
  parentCommentId: string | null;
  isAnonymous: boolean;
  upvoteCount: number;
  downvoteCount: number;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
  // Joined author info (populated by frontend)
  author?: UserRef;
  // Current user's vote on this comment
  myVote?: VoteType | null;
}

// --------------------------------------------------------------------------
// Vote
// --------------------------------------------------------------------------

export interface Vote {
  id: string;
  userId: string;
  targetType: TargetType;
  targetId: string;
  voteType: VoteType;
  createdAt: string;
}

// --------------------------------------------------------------------------
// API Request / Response shapes
// --------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  fullName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

// --------------------------------------------------------------------------
// Discussion filter / query params
// --------------------------------------------------------------------------

export interface DiscussionFilterParams {
  postType?: PostType | '';
  status?: PostStatus | '';
  tag?: string;
  authorId?: string;
  sort?: SortBy;
  search?: string;
  page?: number;
  limit?: number;
}

// --------------------------------------------------------------------------
// Create / Update payloads
// --------------------------------------------------------------------------

export interface CreateDiscussionPayload {
  title: string;
  content: string;
  postType: PostType;
  tagIds: string[];
  mediaIds?: string[];
  isAnonymous?: boolean;
}

export interface UpdateDiscussionPayload {
  title?: string;
  content?: string;
  tagIds?: string[];
}

export interface CreateCommentPayload {
  content: string;
  parentCommentId?: string;
  isAnonymous?: boolean;
}

export interface CastVotePayload {
  voteType: VoteType;
}

// --------------------------------------------------------------------------
// Profile update payloads
// --------------------------------------------------------------------------

export interface UpdateProfilePayload {
  fullName?: string;
  dateOfBirth?: string;
}

export interface UpdateAvatarPayload {
  avatarUrl: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePrivacyPayload {
  privacy: Privacy;
}

export interface RequestChangeEmailPayload {
  newEmail: string;
}

export interface ConfirmChangeEmailPayload {
  otp: string;
}

export interface DeleteAccountPayload {
  password: string;
}
