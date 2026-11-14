// ==========================================================================
// AcaSocial — Shared TypeScript Types
// Mirrors backend data models exactly.
// ==========================================================================

// --------------------------------------------------------------------------
// Enums
// --------------------------------------------------------------------------

export type Role = "student" | "teacher" | "moderator" | "admin";
export type Privacy = "public" | "private";
export type PostType = "question" | "discussion";
export type PostStatus = "open" | "solved" | "closed";
export type VoteType = "upvote" | "downvote";
export type TargetType = "discussion" | "comment" | "answer";
export type SortBy = "newest" | "oldest" | "most_votes" | "most_comments";
export type RoomType = "major" | "course" | "event" | "forum";
export type RoomVisibility = "public" | "restricted" | "private";

// --------------------------------------------------------------------------
// User
// --------------------------------------------------------------------------

export interface User {
  id: string;
  username: string | null;
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

export interface RoomAcademicBinding {
  roomId: string;
  majorId: string;
  courseId: string | null;
  majorCourseId: string | null;
}

export interface Room {
  metadataVersion: number;
  closureAt: string | null;
  reviewPolicy: 'direct' | 'approval';
  policyLocked: boolean;
  effectivePostPermission?: 'direct' | 'approval' | 'blocked';
  canManage?: boolean;
  canConfigurePolicy?: boolean;
  id: string;
  slug: string;
  name: string;
  description: string;
  roomType: RoomType;
  parentRoomId: string | null;
  visibility: RoomVisibility;
  membershipPolicy: "open" | "approval" | "invite_only";
  postingPolicy: "anyone" | "members" | "approved_contributors";
  status: "draft" | "active" | "read_only" | "archived";
  academicBinding: RoomAcademicBinding | null;
  /** Số bài đang hiển thị trong room. */
  postCount?: number;
}

// --------------------------------------------------------------------------
// Discussion (Post)
// --------------------------------------------------------------------------

export interface Discussion {
  canInteract?: boolean;
  roomClosesAt?: string | null;
  pendingRevision?: { title: string; content: string; isAnonymous: boolean; tagIds: string[]; mediaIds: string[] } | null;
  moderationNote?: string;
  isMine?: boolean;
  canManage?: boolean;
  canVote?: boolean;
  media?: { id: string; mediaId: string; sortOrder: number }[];
  acceptedAnswer?: Answer | Comment | null;
  id: string;
  title: string;
  content: string;
  postType: PostType;
  status: PostStatus;
  authorId: string | null;
  isAnonymous: boolean;
  // Stable per (author, post) when anonymous, used to pick a nickname
  anonymousKey?: string;
  // Suffix 1–99, unique among the first 99 anonymous people in a post
  anonymousNumber?: number;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  viewCount: number;
  acceptedCommentId: string | null;
  acceptedAnswerId?: string | null;
  answerCount?: number;
  roomId?: string | null;
  contentVersion?: number;
  moderationStatus?: 'pending' | 'approved' | 'hidden';
  visibility?: 'visible' | 'held' | 'hidden';
  commentsLockReason?: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  // Joined author info (populated by frontend)
  author?: UserRef;
  // Current user's vote (populated when authenticated)
  myVote?: VoteType | null;
}

export interface Answer {
  isMine?: boolean;
  canManage?: boolean;
  canVote?: boolean;
  myVote?: VoteType | null;
  canAcceptAnswer?: boolean;
  id: string;
  discussionId: string;
  authorId: string | null;
  content: string;
  isAnonymous: boolean;
  // Stable per (author, post) when anonymous, used to pick a nickname
  anonymousKey?: string;
  // Suffix 1–99, unique among the first 99 anonymous people in a post
  anonymousNumber?: number;
  contentVersion: number;
  moderationStatus: 'pending' | 'approved' | 'hidden';
  visibility: 'visible' | 'held' | 'hidden';
  upvoteCount: number;
  downvoteCount: number;
  createdAt: string;
  updatedAt: string;
  // Joined author info (absent when anonymous)
  author?: UserRef;
}

// --------------------------------------------------------------------------
// Comment (Answer)
// --------------------------------------------------------------------------

export interface Comment {
  moderationStatus?: 'pending' | 'approved' | 'hidden';
  visibility?: 'visible' | 'held' | 'hidden';
  isMine?: boolean;
  canManage?: boolean;
  canVote?: boolean;
  canAccept?: boolean;
  replyCount?: number;
  kind?: "answer" | "comment" | "reply";
  deletedAt?: string | null;
  id: string;
  discussionId: string;
  authorId: string | null;
  content: string;
  parentCommentId: string | null;
  isAnonymous: boolean;
  // Stable per (author, post) when anonymous, used to pick a nickname
  anonymousKey?: string;
  // Suffix 1–99, unique among the first 99 anonymous people in a post
  anonymousNumber?: number;
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
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
  data: T[];
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
  username: string;
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
  roomId?: string;
  postType?: PostType | "";
  status?: PostStatus | "";
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
  roomId: string;
  majorCourseId?: string;
  title: string;
  content: string;
  postType: PostType;
  tagIds?: string[];
  mediaIds?: string[];
  isAnonymous?: boolean;
  /** Tag AI đã gợi ý lúc soạn, để backend ghi nhận tag nào được giữ / bỏ. */
  aiSuggestion?: { model: string; tags: Array<{ tagId: string; score: number }> };
}

export interface MajorCourse {
  id: string;
  majorId: string;
  courseId: string;
  course: { id: string; code: string | null; name: string };
  courseType: 'required' | 'elective';
  recommendedSemester: number | null;
}

export interface TagSuggestion {
  tag: Tag;
  score: number;
  source: 'embedding' | 'keyword';
}

export interface TagSuggestionResponse {
  available: boolean;
  model: string | null;
  /** ok: có gợi ý; low_confidence: nội dung chưa đủ rõ (vd. gõ linh tinh); off_topic: không thuộc môn chuyên ngành. */
  status: 'ok' | 'low_confidence' | 'off_topic' | null;
  /** Gợi ý chính. */
  tags: TagSuggestion[];
  /** Vài tag sát nút tag chính; rỗng khi không có gợi ý chính. */
  related: TagSuggestion[];
}

export interface UpdateDiscussionPayload {
  expectedVersion?: number;
  mediaIds?: string[];
  isAnonymous?: boolean;
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
