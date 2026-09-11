"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { commentsApi } from "@/lib/api/comments";
import { discussionsApi } from "@/lib/api/discussions";
import { useAuth } from "@/lib/auth/context";
import { VotePill } from "./VotePill";
import { Button } from "@/components/ui/Button";
import type { Comment, Discussion } from "@/types";

interface Props {
  post: Discussion;
  parentId?: string;
  onChange: () => Promise<void>;
  version: number;
}
export function CommentThread({ post, parentId, onChange, version }: Props) {
  const [items, setItems] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    commentsApi
      .list(post.id, page, 20, parentId)
      .then((result) => {
        if (active) {
          setItems(result.data);
          setPages(result.meta.totalPages);
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [post.id, page, parentId, version]);
  const displayed =
    !parentId && page === 1 && post.acceptedAnswer
      ? [
          post.acceptedAnswer,
          ...items.filter((c) => c.id !== post.acceptedAnswer!.id),
        ]
      : items;
  return (
    <div>
      {loading && <p>Đang tải bình luận…</p>}
      {error && <p role="alert">{error}</p>}
      {displayed.map((item) => (
        <CommentEntry
          key={item.id}
          item={item}
          post={post}
          onChange={onChange}
          version={version}
        />
      ))}
      {pages > 1 && (
        <nav
          aria-label="Phân trang bình luận"
          style={{ display: "flex", gap: 12, marginTop: 16 }}
        >
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trang trước
          </Button>
          <span>
            {page}/{pages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </Button>
        </nav>
      )}
    </div>
  );
}
function CommentEntry({
  item,
  post,
  onChange,
  version,
}: { item: Comment } & Omit<Props, "parentId">) {
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"reply" | "edit" | null>(null);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accepted = post.acceptedCommentId === item.id;
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setMode(null);
      setText("");
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể thực hiện thao tác");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      id={`answer-${item.id}`}
      style={{
        padding: 16,
        marginTop: 12,
        border: `1px solid ${accepted ? "var(--color-primary)" : "var(--color-border)"}`,
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        {!item.deletedAt && (
          <VotePill
            key={`${item.id}:${item.myVote}:${item.upvoteCount}:${item.downvoteCount}`}
            targetType="comment"
            targetId={item.id}
            upvoteCount={item.upvoteCount}
            downvoteCount={item.downvoteCount}
            myVote={item.myVote}
            disabled={!item.canVote || post.status === "closed"}
          />
        )}
        <div style={{ minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
          {accepted && <strong>✓ Câu trả lời được chấp nhận</strong>}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {item.content}
          </ReactMarkdown>
          <small>
            {item.deletedAt
              ? "Bình luận đã xóa"
              : item.isAnonymous
                ? "Người dùng ẩn danh"
                : item.isMine
                  ? "Bạn"
                  : (item.author?.fullName ?? "Thành viên")}{" "}
            · {new Date(item.createdAt).toLocaleString()}
          </small>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? "Ẩn trao đổi"
                : `Xem trao đổi${item.replyCount === undefined ? "" : ` (${item.replyCount})`}`}
            </Button>
            {!item.deletedAt && post.status !== "closed" && (
              <>
                {isAuthenticated && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setMode("reply");
                      setText("");
                    }}
                  >
                    Trả lời
                  </Button>
                )}
                {item.canManage && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setMode("edit");
                        setText(item.content);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Xóa bình luận này? Các trao đổi bên dưới được giữ lại.",
                          )
                        )
                          void act(() => commentsApi.remove(item.id));
                      }}
                    >
                      Xóa
                    </Button>
                  </>
                )}
                {post.isMine &&
                  post.postType === "question" &&
                  !item.parentCommentId &&
                  !item.isMine && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          accepted
                            ? discussionsApi.removeAcceptedAnswer(post.id)
                            : discussionsApi.acceptAnswer(post.id, item.id),
                        )
                      }
                    >
                      {accepted ? "Bỏ chấp nhận" : "Chấp nhận câu trả lời"}
                    </Button>
                  )}
              </>
            )}
          </div>
          {error && <p role="alert">{error}</p>}
          {mode && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  if (mode === "edit")
                    await commentsApi.update(item.id, { content: text.trim() });
                  else {
                    await commentsApi.create(post.id, {
                      content: text.trim(),
                      parentCommentId: item.id,
                      isAnonymous: anonymous,
                    });
                    setExpanded(true);
                  }
                });
              }}
            >
              <textarea
                aria-label={
                  mode === "edit" ? "Sửa bình luận" : "Nội dung trả lời"
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={20000}
                required
                style={{ width: "100%", marginTop: 12 }}
              />
              {mode === "reply" && (
                <label>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />{" "}
                  Ẩn danh
                </label>
              )}
              <Button size="sm" type="submit" disabled={busy || !text.trim()}>
                Lưu
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => setMode(null)}
              >
                Hủy
              </Button>
            </form>
          )}
        </div>
      </div>
      {expanded && (
        <CommentThread
          post={post}
          parentId={item.id}
          onChange={onChange}
          version={version}
        />
      )}
    </div>
  );
}
