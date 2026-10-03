"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { discussionsApi } from "@/lib/api/discussions";
import { commentsApi } from "@/lib/api/comments";
import { answersApi } from "@/lib/api/answers";
import { useAuth } from "@/lib/auth/context";
import { AnswerList } from "@/components/academic/AnswerList";
import { CommentThread } from "@/components/academic/CommentThread";
import { AttachmentList } from "@/components/academic/Attachments";
import { TopicChip } from "@/components/academic/TopicChip";
import { VotePill } from "@/components/academic/VotePill";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import type { Discussion } from "@/types";
import styles from "./post-detail.module.css";

/* ── Status helpers ─────────────────────────────────────── */
const STATUS_META: Record<
  string,
  { label: string; icon: string; cls: string; bannerCls: string; bannerText: string }
> = {
  open: {
    label: "Đang mở",
    icon: "●",
    cls: styles.statusOpen,
    bannerCls: "",
    bannerText: "",
  },
  solved: {
    label: "Đã giải quyết",
    icon: "✓",
    cls: styles.statusSolved,
    bannerCls: styles.statusBannerSolved,
    bannerText: "Câu hỏi này đã có câu trả lời được chấp nhận.",
  },
  closed: {
    label: "Đã đóng",
    icon: "✕",
    cls: styles.statusClosed,
    bannerCls: styles.statusBannerClosed,
    bannerText: "Bài viết này đã đóng, không nhận thêm câu trả lời.",
  },
};

/* ── Component ──────────────────────────────────────────── */
export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState<Discussion | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // reply bar state
  const [replyOpen, setReplyOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    const p = await discussionsApi.get(id);
    setPost(p);
    setVersion((v) => v + 1);
  }, [id]);

  useEffect(() => {
    let active = true;
    discussionsApi
      .get(id)
      .then((p) => {
        if (active) { setPost(p); setError(""); }
      })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, user?.id]);

  // Focus textarea when reply bar opens
  useEffect(() => {
    if (replyOpen) textareaRef.current?.focus();
  }, [replyOpen]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (!post)
    return <p role={error ? "alert" : "status"}>{error || "Đang tải bài viết…"}</p>;

  const isQuestion = post.postType === "question";
  const statusInfo = STATUS_META[post.status] ?? STATUS_META.open;
  const canReply = isAuthenticated && post.status !== "closed" && post.moderationStatus === 'approved' && post.visibility === 'visible';

  const authorName = post.isAnonymous
    ? "Người dùng ẩn danh"
    : post.isMine
      ? "Bạn"
      : (post.author?.fullName ?? "Thành viên");

  return (
    <>
      {post.moderationStatus === 'pending' && <p role="status">Bài viết đang chờ admin hoặc moderator duyệt.</p>}
      {post.moderationStatus === 'hidden' && <p role="status">Bài viết chưa được admin hoặc moderator duyệt. Bạn có thể sửa và gửi lại.</p>}
      <article className={styles.wrap}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.headerMeta}>
            {/* Type badge */}
            <span className={`${styles.typeBadge} ${isQuestion ? styles.typeQ : styles.typeD}`}>
              {isQuestion ? "Câu hỏi" : "Thảo luận"}
            </span>

            {/* Status badge */}
            <span className={`${styles.statusBadge} ${statusInfo.cls}`}>
              <span className={styles.statusDot} aria-hidden="true" />
              {statusInfo.label}
            </span>
          </div>

          <h1 className={styles.title}>{post.title}</h1>

          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((t) => (
                <TopicChip key={t.id} tag={t} />
              ))}
            </div>
          )}
        </header>

        {/* ── Status banner (solved / closed only) ── */}
        {post.status !== "open" && statusInfo.bannerText && (
          <div
            className={`${styles.statusBanner} ${statusInfo.bannerCls}`}
            role="note"
            aria-label={statusInfo.bannerText}
          >
            <span className={styles.statusBannerIcon} aria-hidden="true">
              {statusInfo.icon}
            </span>
            {statusInfo.bannerText}
          </div>
        )}

        {error && (
          <p className={styles.submitError} role="alert">{error}</p>
        )}

        {/* ── Post body ── */}
        <div className={styles.postBody}>
          <VotePill
            key={`${post.id}:${post.myVote}:${post.upvoteCount}:${post.downvoteCount}`}
            targetType="discussion"
            targetId={post.id}
            upvoteCount={post.upvoteCount}
            downvoteCount={post.downvoteCount}
            myVote={post.myVote}
            disabled={!post.canVote || post.status === "closed"}
          />

          <div className={styles.bodyContent}>
            <div className={`${styles.postText} ${styles.markdownBody}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>

            <AttachmentList media={post.media ?? []} />

            {/* Author meta */}
            <div className={styles.postMeta}>
              <span className={styles.authorChip}>
                {!post.isAnonymous && (
                  <Avatar src={post.author?.avatarUrl} alt={authorName} size="xs" />
                )}
                <span className={styles.authorName}>{authorName}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time
                className={styles.metaTime}
                dateTime={post.createdAt}
                title={new Date(post.createdAt).toLocaleString()}
              >
                {new Date(post.createdAt).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        </div>

        {/* ── Owner actions ── */}
        {post.canManage && (
          <div className={styles.formActions}>
            <Button
              variant="ghost"
              disabled={busy || post.status === "closed"}
              onClick={() => {
                setEditing(true);
                setTitle(post.title);
                setContent(post.content);
              }}
            >
              Sửa bài
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Xóa bài viết này?")) {
                  setBusy(true);
                  void discussionsApi
                    .remove(post.id)
                    .then(() => router.push("/discussions"))
                    .catch((e) => { setError(e.message); setBusy(false); });
                }
              }}
            >
              Xóa bài
            </Button>
          </div>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <form
            className={styles.editForm}
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await discussionsApi.update(id, { title, content });
                setEditing(false);
              });
            }}
          >
            <Input
              id="edit-title"
              label="Tiêu đề"
              value={title}
              minLength={10}
              maxLength={300}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              id="edit-content"
              label="Nội dung"
              value={content}
              minLength={20}
              maxLength={100000}
              rows={8}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <div className={styles.formActions} style={{ borderTop: "none", background: "none", padding: 0, justifyContent: "flex-start" }}>
              <Button type="submit" disabled={busy}>Lưu thay đổi</Button>
              <Button variant="ghost" type="button" onClick={() => setEditing(false)}>Hủy</Button>
            </div>
          </form>
        )}

        {/* ── Comments / Answers ── */}
        <section className={styles.answersSection}>
          <h2 className={styles.answersTitle}>
            {isQuestion ? "Câu trả lời" : "Bình luận"}{" "}
            ({isQuestion ? (post.answerCount ?? 0) : post.commentCount})
          </h2>
          {isQuestion ? (
            <AnswerList post={post} onChange={refresh} version={version} />
          ) : (
            <CommentThread
              key={`${post.id}:${user?.id ?? "guest"}`}
              post={post}
              onChange={refresh}
              version={version}
            />
          )}
        </section>

        {/* Closed / not-logged-in prompt */}
        {!canReply && (
          <p className={styles.signInPrompt}>
            {post.status === "closed"
              ? "Bài viết đã đóng."
              : <a href="/login">Đăng nhập để tham gia trao đổi</a>}
          </p>
        )}

        {/* Spacer so content isn't hidden behind sticky bar */}
        {canReply && (
          <div
            className={styles.replyBarSpacer}
            data-open={String(replyOpen)}
            aria-hidden="true"
          />
        )}
      </article>

      {/* ── Sticky reply bar ── */}
      {canReply && (
        <div className={styles.replyBar} data-open={String(replyOpen)}>
          {/* Collapsed trigger row */}
          <div className={styles.replyTriggerRow}>
            <button
              className={styles.replyTriggerHint}
              type="button"
              onClick={() => setReplyOpen(true)}
              aria-expanded={replyOpen}
              aria-label={isQuestion ? "Viết câu trả lời" : "Thêm bình luận"}
            >
              {isQuestion ? "Viết câu trả lời của bạn…" : "Thêm bình luận…"}
            </button>
          </div>

          {/* Expanded form */}
          {replyOpen && (
            <form
              className={styles.replyFormBody}
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const payload = { content: text.trim(), isAnonymous: anonymous };
                  if (isQuestion) await answersApi.create(id, payload);
                  else await commentsApi.create(id, payload);
                  setText("");
                  setReplyOpen(false);
                });
              }}
            >
              <Textarea
                id="answer-text"
                label={isQuestion ? "Câu trả lời của bạn" : "Bình luận"}
                rows={4}
                maxLength={20000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
              <div className={styles.replyFormFooter}>
                <label className={styles.anonymousLabel}>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  Ẩn danh
                </label>
                <div className={styles.replyFormActions}>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => { setReplyOpen(false); setText(""); }}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={busy || !text.trim()}>
                    Gửi
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
