"use client";
import { ROOM_TYPE_LABELS } from '@/lib/constants';

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { discussionsApi } from "@/lib/api/discussions";
import { useAuth } from "@/lib/auth/context";
import { KnowledgePostCard } from "@/components/academic/KnowledgePostCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Discussion, PaginatedResponse, PostType, SortBy } from "@/types";
import {
  SORT_OPTIONS,
  POST_TYPE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  ROUTES,
} from "@/lib/constants";
import styles from "./feed.module.css";
import { useRoom } from "@/lib/rooms/context";
import { RoomChooser } from "@/components/rooms/RoomChooser";

interface FeedProps {
  /** Pre-filter by post type (for /questions and /discussions routes) */
  fixedPostType?: PostType;
  /** Pre-filter by tag slug (for /tags/[slug] route) */
  fixedTag?: string;
  title: string;
  description?: string;
}

export function Feed({
  fixedPostType,
  fixedTag,
  title,
  description,
}: FeedProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { rooms, selectedRoom, loading: roomsLoading, selectRoom } = useRoom();

  const [data, setData] = useState<PaginatedResponse<Discussion> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read filter state from URL
  const search = searchParams.get("search") ?? "";
  const tag = fixedTag ?? searchParams.get("tag") ?? "";
  const sort = (searchParams.get("sort") ?? "newest") as SortBy;
  const postType =
    fixedPostType ?? ((searchParams.get("type") ?? "") as PostType | "");
  const page = Number(searchParams.get("page") ?? "1");

  const fetchData = useCallback(async () => {
    if (!selectedRoom) return;
    setLoading(true);
    setError(null);
    try {
      const result = await discussionsApi.list({
        roomId: selectedRoom.id,
        search: search || undefined,
        tag: tag || undefined,
        sort,
        postType: postType || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setData(result);
    } catch {
      setError("Không thể tải bài đăng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [search, tag, sort, postType, page, selectedRoom]);

  useEffect(() => {
    if (!selectedRoom) {
      setData(null);
      setLoading(false);
      return;
    }
    const loadFeed = async () => {
      await fetchData();
    };
    void loadFeed();
  }, [fetchData, selectedRoom]);

  if (roomsLoading) return <LoadingState variant="feed" count={6} />;
  if (!selectedRoom) return <RoomChooser />;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={styles.wrap}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{selectedRoom.name}</h1>
          {description && <p className={styles.pageDesc}>{description}</p>}
          <p className={styles.pageDesc}>{title}</p>
        </div>
        {isAuthenticated && (
          <Button size="sm" onClick={() => router.push(ROUTES.POST_CREATE)}>
            + Tạo bài đăng
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className={styles.filters} role="search" aria-label="Lọc bài đăng">
        <Select
          id="active-room"
          options={rooms
            .filter((room) => room.status === "active")
            .map((room) => ({ value: room.id, label: `${room.name} · ${ROOM_TYPE_LABELS[room.roomType]}` }))}
          value={selectedRoom.id}
          onChange={(event) => {
            const room = rooms.find((item) => item.id === event.target.value);
            if (room) selectRoom(room);
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
            onChange={(e) => updateParam("type", e.target.value)}
            aria-label="Loại bài đăng"
          />
        )}
        <Select
          id="filter-sort"
          options={
            SORT_OPTIONS as unknown as { value: string; label: string }[]
          }
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          aria-label="Sắp xếp"
        />
        {search && (
          <div className={styles.searchPill}>
            <span>
              Tìm kiếm: <strong>{search}</strong>
            </span>
            <button
              className={styles.clearBtn}
              onClick={() => updateParam("search", "")}
              aria-label="Xóa tìm kiếm"
            >
              ×
            </button>
          </div>
        )}
        {tag && (
          <div className={styles.searchPill}>
            <span>
              Thẻ: <strong>{tag}</strong>
            </span>
            <button
              className={styles.clearBtn}
              onClick={() => updateParam("tag", "")}
              aria-label="Bỏ lọc theo thẻ"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading && <LoadingState variant="feed" count={8} />}

      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && data && data.data.length === 0 && (
        <EmptyState
          title={search ? "Không tìm thấy bài đăng" : "Chưa có bài đăng"}
          description={
            search
              ? `Không có bài đăng phù hợp với "${search}". Hãy thử từ khóa khác.`
              : "Tạo câu hỏi hoặc bài thảo luận đầu tiên trong phòng."
          }
          action={
            isAuthenticated ? (
              <Button size="sm" onClick={() => router.push(ROUTES.POST_CREATE)}>
                + Tạo bài đăng
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
                onClick={() => updateParam("page", String(page - 1))}
              >
                ← Trang trước
              </Button>
              <span className={styles.pageInfo}>
                Trang {page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => updateParam("page", String(page + 1))}
              >
                Trang sau →
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
