"use client";

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
    setLoading(true);
    setError(null);
    try {
      const result = await discussionsApi.list({
        search: search || undefined,
        tag: tag || undefined,
        sort,
        postType: postType || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setData(result);
    } catch {
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, tag, sort, postType, page]);

  useEffect(() => {
    const loadFeed = async () => {
      await fetchData();
    };
    void loadFeed();
  }, [fetchData]);

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
          <h1 className={styles.pageTitle}>{title}</h1>
          {description && <p className={styles.pageDesc}>{description}</p>}
        </div>
        {isAuthenticated && (
          <Button size="sm" onClick={() => router.push(ROUTES.POST_CREATE)}>
            + Ask a question
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className={styles.filters} role="search" aria-label="Filter posts">
        {!fixedPostType && (
          <Select
            id="filter-type"
            options={
              POST_TYPE_OPTIONS as unknown as { value: string; label: string }[]
            }
            value={postType}
            onChange={(e) => updateParam("type", e.target.value)}
            aria-label="Post type"
          />
        )}
        <Select
          id="filter-sort"
          options={
            SORT_OPTIONS as unknown as { value: string; label: string }[]
          }
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          aria-label="Sort by"
        />
        {search && (
          <div className={styles.searchPill}>
            <span>
              Search: <strong>{search}</strong>
            </span>
            <button
              className={styles.clearBtn}
              onClick={() => updateParam("search", "")}
              aria-label="Clear search"
            >
              ×
            </button>
          </div>
        )}
        {tag && (
          <div className={styles.searchPill}>
            <span>
              Tag: <strong>{tag}</strong>
            </span>
            <button
              className={styles.clearBtn}
              onClick={() => updateParam("tag", "")}
              aria-label="Clear tag filter"
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
          title={search ? "No results found" : "No posts yet"}
          description={
            search
              ? `No posts match "${search}". Try a different search term.`
              : "Be the first to ask a question or start a discussion."
          }
          action={
            isAuthenticated ? (
              <Button size="sm" onClick={() => router.push(ROUTES.POST_CREATE)}>
                + Ask a question
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && data && data.data.length > 0 && (
        <>
          <div className={styles.list} role="feed" aria-label="Posts">
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
            <nav className={styles.pagination} aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParam("page", String(page - 1))}
              >
                ← Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => updateParam("page", String(page + 1))}
              >
                Next →
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
