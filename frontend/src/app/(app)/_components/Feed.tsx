'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { discussionsApi } from '@/lib/api/discussions'
import { useAuth } from '@/lib/auth/context'
import { KnowledgePostCard } from '@/components/academic/KnowledgePostCard'
import { LoadingState } from '@/components/shared/LoadingState'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Discussion, PaginatedResponse, PostType, PostStatus, SortBy } from '@/types'
import {
  SORT_OPTIONS,
  POST_TYPE_OPTIONS,
  POST_STATUS_OPTIONS,
  ROOM_TYPE_LABELS,
  DEFAULT_PAGE_SIZE,
  ROUTES,
} from '@/lib/constants'
import styles from './feed.module.css'
import { useRoom } from '@/lib/rooms/context'
import { RoomChooser } from '@/components/rooms/RoomChooser'

interface FeedProps {
  /** Pre-filter by post type (for /questions and /discussions routes) */
  fixedPostType?: PostType
  /** Pre-filter by tag slug (for /tags/[slug] route) */
  fixedTag?: string
  title: string
  description?: string
}

export function Feed({
  fixedPostType,
  fixedTag,
  title,
  description,
}: FeedProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const { rooms, selectedRoom, loading: roomsLoading, selectRoom } = useRoom()

  const [data, setData] = useState<PaginatedResponse<Discussion> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read filter state from URL
  const search = searchParams.get('search') ?? ''
  const tag = fixedTag ?? searchParams.get('tag') ?? ''
  const sort = (searchParams.get('sort') ?? 'newest') as SortBy
  const postType =
    fixedPostType ?? ((searchParams.get('type') ?? '') as PostType | '')
  const status = (searchParams.get('status') ?? '') as PostStatus | ''
  const page = Number(searchParams.get('page') ?? '1')

  const fetchData = useCallback(async () => {
    if (!selectedRoom) return
    setLoading(true)
    setError(null)
    try {
      const result = await discussionsApi.list({
        roomId: selectedRoom.id,
        search: search || undefined,
        tag: tag || undefined,
        sort,
        postType: postType || undefined,
        status: status || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      })
      setData(result)
    } catch {
      setError('Không thể tải bài đăng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [search, tag, sort, postType, status, page, selectedRoom])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedRoom) {
      setData(null)
      setLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, selectedRoom])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (roomsLoading) return <LoadingState variant="feed" count={6} />
  if (!selectedRoom) return <RoomChooser />

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page') // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearAllFilters() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')
    params.delete('tag')
    if (!fixedPostType) params.delete('type')
    params.delete('status')
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const headerTitle = fixedPostType ? title : selectedRoom.name
  const ctaLabel =
    fixedPostType === 'question'
      ? '+ Đặt câu hỏi'
      : fixedPostType === 'discussion'
        ? '+ Tạo thảo luận'
        : '+ Tạo bài đăng'

  const activeChips = [
    search && {
      key: 'search',
      label: `Từ khóa: "${search}"`,
      onRemove: () => updateParam('search', ''),
    },
    tag && {
      key: 'tag',
      label: `Thẻ: ${tag}`,
      onRemove: () => updateParam('tag', ''),
    },
    (!fixedPostType && postType) && {
      key: 'type',
      label: postType === 'question' ? 'Câu hỏi' : 'Thảo luận',
      onRemove: () => updateParam('type', ''),
    },
    (fixedPostType === 'question' && status) && {
      key: 'status',
      label: POST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
      onRemove: () => updateParam('status', ''),
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[]

  const emptyTitle = search
    ? `Không tìm thấy kết quả cho '${search}'`
    : fixedPostType === 'question'
      ? 'Chưa có câu hỏi nào trong phòng này'
      : fixedPostType === 'discussion'
        ? 'Chưa có thảo luận nào trong phòng này'
        : 'Chưa có bài đăng nào trong phòng này'

  const emptyDescription = search
    ? `Không có bài đăng phù hợp với "${search}". Hãy thử từ khóa khác.`
    : fixedPostType === 'question'
      ? 'Hãy là người đầu tiên đặt câu hỏi trong phòng này.'
      : fixedPostType === 'discussion'
        ? 'Hãy là người đầu tiên bắt đầu cuộc thảo luận trong phòng này.'
        : 'Tạo câu hỏi hoặc bài thảo luận đầu tiên trong phòng.'

  return (
    <div className={styles.wrap}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <h1 className={styles.pageTitle}>{headerTitle}</h1>
          {description && <p className={styles.pageDesc}>{description}</p>}
        </div>
        {isAuthenticated && (
          <Button size="sm" onClick={() => router.push(ROUTES.POST_CREATE)}>
            {ctaLabel}
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className={styles.filters} role="search" aria-label="Lọc bài đăng">
        <div className={styles.filterControls}>
          <Select
            id="active-room"
            options={rooms
              .filter((room) => room.status === 'active')
              .map((room) => ({
                value: room.id,
                label: `${room.name} · ${ROOM_TYPE_LABELS[room.roomType]}`,
              }))}
            value={selectedRoom.id}
            onChange={(event) => {
              const room = rooms.find((item) => item.id === event.target.value)
              if (room) selectRoom(room)
            }}
            aria-label="Phòng đang xem"
          />
          {!fixedPostType && (
            <Select
              id="filter-type"
              options={
                POST_TYPE_OPTIONS as unknown as { value: string; label: string }[]
              }
              value={postType}
              onChange={(e) => updateParam('type', e.target.value)}
              aria-label="Loại bài đăng"
            />
          )}
          {fixedPostType === 'question' && (
            <Select
              id="filter-status"
              options={
                POST_STATUS_OPTIONS as unknown as { value: string; label: string }[]
              }
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              aria-label="Trạng thái câu hỏi"
            />
          )}
          <Select
            id="filter-sort"
            options={
              SORT_OPTIONS as unknown as { value: string; label: string }[]
            }
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            aria-label="Sắp xếp"
          />
        </div>

        {activeChips.length > 0 && (
          <div className={styles.filterChips}>
            {activeChips.map((chip) => (
              <span key={chip.key} className={styles.filterChip}>
                <span>{chip.label}</span>
                <button
                  type="button"
                  className={styles.filterChipRemove}
                  onClick={chip.onRemove}
                  aria-label={`Xóa lọc ${chip.label}`}
                >
                  ×
                </button>
              </span>
            ))}
            {activeChips.length >= 2 && (
              <button
                type="button"
                className={styles.clearAllBtn}
                onClick={clearAllFilters}
              >
                Xóa tất cả
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading && <LoadingState variant="feed" count={8} />}

      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && data && data.data.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            isAuthenticated ? (
              <Button size="sm" onClick={() => router.push(ROUTES.POST_CREATE)}>
                {ctaLabel}
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && data && data.data.length > 0 && (
        <>
          <div className={styles.list} role="feed" aria-label="Bài đăng">
            {data.data.map((discussion) => (
              <KnowledgePostCard
                key={discussion.id}
                discussion={discussion}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Phân trang">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                ← Trang trước
              </Button>
              <span className={styles.pageInfo}>
                Trang {page}/{data.meta.totalPages} · {data.meta.totalItems} bài đăng
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                Trang sau →
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
