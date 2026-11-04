'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { discussionsApi } from '@/lib/api/discussions'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { FacultyBadge } from '@/components/academic/FacultyBadge'
import { KnowledgePostCard } from '@/components/academic/KnowledgePostCard'
import { LoadingState } from '@/components/shared/LoadingState'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import type { Discussion, PostType, SortBy } from '@/types'
import styles from './profile.module.css'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'question' | 'discussion'>(
    'all'
  )
  const [posts, setPosts] = useState<Discussion[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [errorPosts, setErrorPosts] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortBy>('newest')

  const fetchMyPosts = useCallback(async () => {
    if (!user) return
    setLoadingPosts(true)
    setErrorPosts(null)
    try {
      const res = await discussionsApi.list({
        authorId: user.id,
        postType: activeTab === 'all' ? undefined : (activeTab as PostType),
        limit: 20,
        search,
        sort,
      })
      setPosts(res.data)
    } catch {
      setErrorPosts('Không thể tải bài đăng của bạn.')
    } finally {
      setLoadingPosts(false)
    }
  }, [user, activeTab, search, sort])

  useEffect(() => {
    if (!user) return
    void fetchMyPosts()
  }, [user, activeTab, sort, fetchMyPosts])

  // Debounce search separately to avoid calling API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMyPosts()
    }, 300)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return <LoadingState label="Đang tải hồ sơ…" />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <div
          className={styles.profileCard}
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <h2>Đăng nhập để xem hồ sơ</h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              margin: '12px 0 24px',
            }}
          >
            Đăng nhập để xem bài đăng và quản lý hồ sơ của bạn.
          </p>
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}
          >
            <Link href="/login">
              <Button variant="primary">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Tạo tài khoản</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown'

  const emptyTitle = search
    ? 'Không tìm thấy bài đăng phù hợp'
    : activeTab === 'question'
    ? 'Chưa có câu hỏi nào'
    : activeTab === 'discussion'
    ? 'Chưa có thảo luận nào'
    : 'Chưa có bài đăng nào'

  const emptyDesc = search
    ? 'Thử tìm kiếm với từ khóa khác.'
    : 'Chia sẻ câu hỏi hoặc bắt đầu một thảo luận.'

  return (
    <div className={styles.container}>
      {/* Profile Card */}
      <div className={styles.profileCard}>
        {/* Top: user info + edit button */}
        <div className={styles.cardHeader}>
          <div className={styles.userInfo}>
            <Avatar src={user.avatarUrl} alt={user.fullName} size="lg" />
            <div className={styles.userMeta}>
              <div className={styles.nameRow}>
                <h1 className={styles.fullName}>{user.fullName}</h1>
                <FacultyBadge role={user.role} />
              </div>
              <span className={styles.username}>
                {user.username ? `@${user.username}` : ''}
              </span>
              <div className={styles.detailsRow}>
                {/* Email */}
                <span className={styles.detailItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <rect x="1" y="3" width="11" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1 4l5.5 4L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  </svg>
                  {user.email}
                </span>
                {/* Join date */}
                <span className={styles.detailItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <rect x="1" y="2" width="11" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1 5.5h11M4.5 1v2M8.5 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Tham gia {joinDate}
                </span>
                {/* Privacy badge */}
                <span className={styles.privacyBadge}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                    <rect x="1.5" y="5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M3.5 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {user.privacy === 'public' ? 'Công khai' : 'Riêng tư'}
                </span>
              </div>
            </div>
          </div>

          <Link href="/profile/settings">
            <Button variant="outline" size="sm">
              Chỉnh sửa hồ sơ
            </Button>
          </Link>
        </div>

        {/* Divider */}
        <div className={styles.statsDivider} />

        {/* Stats section */}
        <div className={styles.statsRow}>
          {/* Numeric stats */}
          <div className={styles.numericStats}>
            <div className={styles.numericStat}>
              <span className={styles.statValue}>150</span>
              <span className={styles.statLabel}>Điểm uy tín</span>
            </div>
            <div className={styles.numericStat}>
              <span className={styles.statValue}>{posts.length}</span>
              <span className={styles.statLabel}>Tổng bài đăng</span>
            </div>
          </div>

          {/* Status badges */}
          <div className={styles.statusBadges}>
            <span className={user.isVerified ? styles.badgeVerified : styles.badgeUnverified}>
              {user.isVerified ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M3.5 6l1.8 1.8 3-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M6 4v3M6 8.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              )}
              {user.isVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}
            </span>
            <span className={styles.badgeActive}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                <circle cx="4" cy="4" r="3.5" fill="currentColor"/>
              </svg>
              Đang hoạt động
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`${styles.tabBtn} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Tất cả
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'question'}
          className={`${styles.tabBtn} ${activeTab === 'question' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('question')}
        >
          Câu hỏi
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'discussion'}
          className={`${styles.tabBtn} ${activeTab === 'discussion' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('discussion')}
        >
          Thảo luận
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.searchInputWrapper}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Tìm kiếm bài đăng…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortBy)}
          aria-label="Sắp xếp bài đăng"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="most_votes">Nhiều vote nhất</option>
        </select>
      </div>

      {/* Posts Section */}
      {loadingPosts && <LoadingState label="Đang tải bài đăng…" />}
      {errorPosts && <ErrorState message={errorPosts} onRetry={fetchMyPosts} />}

      {!loadingPosts && !errorPosts && posts.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDesc}
          action={
            !search ? (
              <Link href="/posts/create">
                <Button variant="primary" size="sm">
                  Tạo bài đăng
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {!loadingPosts && !errorPosts && posts.length > 0 && (
        <div className={styles.postsList}>
          {posts.map((post) => (
            <KnowledgePostCard key={post.id} discussion={post} />
          ))}
        </div>
      )}
    </div>
  )
}
