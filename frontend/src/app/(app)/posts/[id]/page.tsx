"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { discussionsApi } from "@/lib/api/discussions";
import { commentsApi } from "@/lib/api/comments";
import { useAuth } from "@/lib/auth/context";
import { CommentThread } from "@/components/academic/CommentThread";
import { AttachmentList } from "@/components/academic/Attachments";
import { TopicChip } from "@/components/academic/TopicChip";
import { VotePill } from "@/components/academic/VotePill";
import { Button } from "@/components/ui/Button";
import type { Discussion } from "@/types";
import styles from "./post-detail.module.css";
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
        if (active) {
          setPost(p);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, user?.id]);
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
    return (
      <p role={error ? "alert" : "status"}>{error || "Đang tải bài viết…"}</p>
    );
  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <p>
          {post.postType === "question" ? "Câu hỏi" : "Thảo luận"} ·{" "}
          {post.status}
        </p>
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.tags}>
          {post.tags.map((t) => (
            <TopicChip key={t.id} tag={t} />
          ))}
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
          <AttachmentList media={post.media ?? []} />
          <p>
            {post.isAnonymous
              ? "Người dùng ẩn danh"
              : post.isMine
                ? "Bạn"
                : (post.author?.fullName ?? "Thành viên")}{" "}
            · {new Date(post.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
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
                  .catch((e) => {
                    setError(e.message);
                    setBusy(false);
                  });
              }
            }}
          >
            Xóa bài
          </Button>
        </div>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await discussionsApi.update(id, { title, content });
              setEditing(false);
            });
          }}
        >
          <input
            aria-label="Sửa tiêu đề"
            value={title}
            minLength={10}
            maxLength={300}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            aria-label="Sửa nội dung bài"
            value={content}
            minLength={20}
            maxLength={100000}
            rows={8}
            onChange={(e) => setContent(e.target.value)}
            required
            style={{ width: "100%" }}
          />
          <Button type="submit" disabled={busy}>
            Lưu thay đổi
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setEditing(false)}
          >
            Hủy
          </Button>
        </form>
      )}
      <section className={styles.answersSection}>
        <h2>
          {post.postType === "question"
            ? "Câu trả lời và trao đổi"
            : "Bình luận"}{" "}
          ({post.commentCount})
        </h2>
        <CommentThread
          key={`${post.id}:${user?.id ?? "guest"}`}
          post={post}
          onChange={refresh}
          version={version}
        />
      </section>
      {isAuthenticated && post.status !== "closed" ? (
        <section className={styles.answerForm}>
          <h2>
            {post.postType === "question"
              ? "Câu trả lời của bạn"
              : "Thêm bình luận"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await commentsApi.create(id, {
                  content: text.trim(),
                  isAnonymous: anonymous,
                });
                setText("");
              });
            }}
          >
            <textarea
              id="answer-text"
              aria-label="Nội dung câu trả lời"
              rows={6}
              maxLength={20000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              style={{ width: "100%" }}
            />
            <label>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />{" "}
              Ẩn danh
            </label>
            <Button type="submit" disabled={busy || !text.trim()}>
              Gửi
            </Button>
          </form>
        </section>
      ) : (
        <p>
          {post.status === "closed" ? (
            "Bài viết đã đóng."
          ) : (
            <a href="/login">Đăng nhập để tham gia trao đổi</a>
          )}
        </p>
      )}
    </article>
  );
}
