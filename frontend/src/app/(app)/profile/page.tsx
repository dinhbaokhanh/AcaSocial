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
import type { Discussion, PostType } from '@/types'
import styles from './profile.module.css'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'question' | 'discussion'>(
    'all'
  )
  const [posts, setPosts] = useState<Discussion[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [errorPosts, setErrorPosts] = useState<string | null>(null)

  const fetchMyPosts = useCallback(async () => {
    if (!user) return
    setLoadingPosts(true)
    setErrorPosts(null)
    try {
      const res = await discussionsApi.list({
        authorId: user.id,
        postType: activeTab === 'all' ? undefined : (activeTab as PostType),
        limit: 20,
      })
      setPosts(res.data)
    } catch {
      setErrorPosts('Failed to load your posts.')
    } finally {
      setLoadingPosts(false)
    }
  }, [user, activeTab])

  useEffect(() => {
    if (!user) return

    const loadPosts = async () => {
      await fetchMyPosts()
    }
    void loadPosts()
  }, [user, fetchMyPosts])

  if (authLoading) {
    return <LoadingState label="Loading profile..." />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <div
          className={styles.profileCard}
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <h2>Sign in to view your profile</h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              margin: '12px 0 24px',
            }}
          >
            You need to be logged in to view your contributions and manage your
            academic profile.
          </p>
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}
          >
            <Link href="/login">
              <Button variant="primary">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown'

  return (
    <div className={styles.container}>
      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.cardHeader}>
          <div className={styles.userInfo}>
            <Avatar src={user.avatarUrl} alt={user.fullName} size="xl" />
            <div className={styles.userMeta}>
              <h1 className={styles.fullName}>
                {user.fullName}
                <FacultyBadge role={user.role} />
              </h1>
              <span className={styles.username}>{user.username ? `@${user.username}` : 'Email not verified'}</span>
              <div className={styles.detailsRow}>
                <span>📧 {user.email}</span>
                <span>📅 Joined {joinDate}</span>
                <span>🔒 Privacy: {user.privacy}</span>
              </div>
            </div>
          </div>

          <Link href="/profile/settings">
            <Button variant="outline" size="sm">
              ⚙ Edit Profile & Settings
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>150</span>
            <span className={styles.statLabel}>Reputation Score</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{posts.length}</span>
            <span className={styles.statLabel}>Contributions</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {user.isVerified ? 'Verified' : 'Pending'}
            </span>
            <span className={styles.statLabel}>Email Status</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>Active</span>
            <span className={styles.statLabel}>Account Status</span>
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
          All Contributions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'question'}
          className={`${styles.tabBtn} ${activeTab === 'question' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('question')}
        >
          Questions Asked
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'discussion'}
          className={`${styles.tabBtn} ${activeTab === 'discussion' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('discussion')}
        >
          Discussions
        </button>
      </div>

      {/* Posts Section */}
      {loadingPosts && <LoadingState label="Loading your posts..." />}
      {errorPosts && <ErrorState message={errorPosts} onRetry={fetchMyPosts} />}

      {!loadingPosts && !errorPosts && posts.length === 0 && (
        <EmptyState
          title="No posts found"
          description="You haven't published any questions or discussions in this category yet."
          action={
            <Link href="/posts/create">
              <Button variant="primary" size="sm">
                Ask a Question
              </Button>
            </Link>
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
