"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/auth/context";
import { useRoom } from "@/lib/rooms/context";
import {
  moderationApi,
  type ModerationQueue,
  type PendingContent,
  type ReviewDecision,
} from "@/lib/api/moderation";
import { mediaApi } from "@/lib/api/media";
import { externalLinks } from "@/lib/link-safety";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ReviewIcon } from "@/components/ui/ReviewIcon";
import { AttachmentList } from "@/components/academic/Attachments";
import styles from "./moderation.module.css";

const statuses = [
  { key: "pending", label: "Chờ kiểm duyệt", icon: "clock" },
  { key: "approved", label: "Đã duyệt", icon: "check" },
  { key: "hidden", label: "Chưa chấp nhận / Ẩn", icon: "block" },
] as const;
const decisionLabels = {
  allow: "Đã duyệt",
  hold: "Yêu cầu chỉnh sửa",
  hide: "Từ chối / Ẩn",
};
const date = (value: string) => new Date(value).toLocaleString("vi-VN");
const name = (item: PendingContent) =>
  item.isAnonymous
    ? "Thành viên ẩn danh"
    : (item.author?.fullName ?? "Thành viên");

export default function ModerationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { rooms, loading: roomsLoading } = useRoom();
  const canReview =
    !!user &&
    (["admin", "moderator"].includes(user.role) ||
      rooms.some((r) => r.canManage));
  const [queue, setQueue] = useState<ModerationQueue | null>(null);
  const [status, setStatus] = useState("pending");
  const [room, setRoom] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await moderationApi.pending(status, page, room, query);
      if (current === generation.current) {
        setQueue(result);
        setSelected((id) => (result.data.some((p) => p.id === id) ? id : null));
      }
    } catch (e) {
      if (current === generation.current) {
        setQueue(null);
        setError(e instanceof Error ? e.message : "Không tải được nội dung");
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [status, page, room, query]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active && canReview) void load();
    });
    return () => {
      active = false;
    };
  }, [canReview, load, user?.id]);
  const item = queue?.data.find((p) => p.id === selected);
  async function review(
    target: PendingContent,
    decision: ReviewDecision,
    note: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await moderationApi.review(target, decision, note);
      setNotice(`${decisionLabels[decision]}: ${target.title}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể duyệt nội dung");
    } finally {
      setBusy(false);
    }
  }
  if (authLoading || roomsLoading)
    return <p role="status">Đang tải quyền kiểm duyệt…</p>;
  if (!canReview)
    return (
      <div className={styles.empty}>
        <ReviewIcon />
        <h1>Kiểm duyệt nội dung</h1>
        <p>
          Bạn cần quyền quản lý room hoặc quyền kiểm duyệt để sử dụng trang này.
        </p>
      </div>
    );
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <ReviewIcon /> Không gian quản lý
          </span>
          <h1>Kiểm duyệt nội dung</h1>
          <p className={styles.muted}>
            Xem xét post, kiểm tra tệp và giữ các cuộc trao đổi hữu ích.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/moderation/rooms">
            <Button variant="outline">Cấu hình room</Button>
          </Link>
          <Button
            variant="ghost"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            <ReviewIcon kind="refresh" /> Tải lại
          </Button>
        </div>
      </header>
      <div className={styles.stats}>
        {statuses.map((s) => (
          <button
            key={s.key}
            className={`${styles.stat} ${styles[s.key] ?? ""}`}
            aria-pressed={status === s.key}
            disabled={busy}
            onClick={() => {
              generation.current++;
              setLoading(true);
              setStatus(s.key);
              setPage(1);
              setSelected(null);
            }}
          >
            <span className={styles.statIcon}>
              <ReviewIcon kind={s.icon} />
            </span>
            <span>
              <strong>{queue?.counts[s.key] ?? "—"}</strong>
              <small>{s.label}</small>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.filters}>
        <label>
          Tìm post hoặc mã tác giả
          <input
            value={search}
            onChange={(e) => {
              generation.current++;
              setSearch(e.target.value);
            }}
            placeholder="Nhập tiêu đề hoặc mã tác giả…"
            disabled={busy}
          />
        </label>
        <label>
          Phòng thảo luận
          <select
            value={room}
            disabled={busy}
            onChange={(e) => {
              generation.current++;
              setLoading(true);
              setRoom(e.target.value);
              setPage(1);
              setSelected(null);
            }}
          >
            <option value="">Tất cả room được quản lý</option>
            {rooms
              .filter((r) => r.canManage)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {error && (
        <div className={styles.alert} role="alert">
          {error}{" "}
          <button onClick={() => void load()} disabled={busy}>
            Tải lại
          </button>
        </div>
      )}
      {notice && (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      )}
      <div
        className={styles.workspace}
        data-selected={!!item}
        aria-busy={loading}
      >
        <div className={styles.queue}>
          <div className={styles.queueHead}>
            <strong>{statuses.find((s) => s.key === status)?.label}</strong>
            <span>{queue?.meta.totalItems ?? 0} post</span>
          </div>
          {loading ? (
            <div className={styles.empty} role="status">
              <ReviewIcon kind="clock" />
              <p>Đang tải hàng chờ…</p>
            </div>
          ) : !queue?.data.length ? (
            <div className={styles.empty}>
              <ReviewIcon kind="check" />
              <h2>Không có post</h2>
              <p className={styles.muted}>
                Không có nội dung phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <div className={styles.cards}>
              {queue.data.map((post) => (
                <button
                  key={post.id}
                  disabled={busy}
                  className={styles.card}
                  aria-pressed={selected === post.id}
                  onClick={() => setSelected(post.id)}
                >
                  <div className={styles.row}>
                    <Avatar
                      alt={name(post)}
                      src={post.author?.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <strong>{name(post)}</strong>
                      <small>{date(post.createdAt)}</small>
                    </div>
                  </div>
                  <h3>{post.title}</h3>
                  <p className={styles.excerpt}>{post.content}</p>
                  <div className={styles.tags}>
                    <span className={styles.badge}>{post.roomName}</span>
                    {post.media.length > 0 && (
                      <span className={styles.badge}>
                        <ReviewIcon kind="file" /> {post.media.length}
                      </span>
                    )}
                    <span
                      className={`${styles.badge} ${post.visibility === "held" ? styles.warning : ""}`}
                    >
                      {post.isRevision
                        ? "Bản sửa"
                        : post.visibility === "held"
                          ? "Chờ xuất bản"
                          : post.visibility === "visible"
                            ? "Đang hiển thị"
                            : "Đã ẩn"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className={styles.pagination}>
            <Button
              variant="ghost"
              disabled={page <= 1 || loading || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Trước
            </Button>
            <span>
              {page} / {Math.max(1, queue?.meta.totalPages ?? 1)}
            </span>
            <Button
              variant="ghost"
              disabled={
                page >= (queue?.meta.totalPages ?? 1) || loading || busy
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Sau →
            </Button>
          </div>
        </div>
        {item && !loading ? (
          <ReviewDetail
            key={`${item.id}:${item.contentVersion}:${item.updatedAt}`}
            item={item}
            busy={busy}
            onReview={review}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className={`${styles.detail} ${styles.empty}`}>
            <ReviewIcon />
            <h2>Chọn một post để xem xét</h2>
            <p className={styles.muted}>
              Nội dung, liên kết, file đính kèm và lịch sử xử lý sẽ hiển thị tại
              đây.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewDetail({
  item,
  busy,
  onReview,
  onBack,
}: {
  item: PendingContent;
  busy: boolean;
  onReview: (
    item: PendingContent,
    decision: ReviewDecision,
    note: string,
  ) => Promise<void>;
  onBack: () => void;
}) {
  const [note, setNote] = useState("");
  const [validation, setValidation] = useState("");
  const [filesSafe, setFilesSafe] = useState(item.media.length === 0);
  const [checking, setChecking] = useState(item.media.length > 0);
  const [retry, setRetry] = useState(0);
  const links = externalLinks(
    item.content,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  useEffect(() => {
    let active = true;
    Promise.all(item.media.map((m) => mediaApi.get(m.mediaId)))
      .then((files) => {
        if (active) setFilesSafe(files.every((f) => f.scanStatus === "clean"));
      })
      .catch(() => {
        if (active) setFilesSafe(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [item.media, retry]);
  function decide(decision: ReviewDecision) {
    if (decision !== "allow" && !note.trim()) {
      setValidation("Hãy nhập lý do để người gửi biết cần thay đổi điều gì.");
      return;
    }
    setValidation("");
    void onReview(item, decision, note);
  }
  return (
    <article className={styles.detail}>
      <div className={styles.detailHead}>
        <div className={styles.tags}>
          <span className={styles.badge}>{item.roomName}</span>
          <span className={`${styles.badge} ${styles.warning}`}>
            {item.isRevision
              ? "Kiểm tra bản sửa"
              : item.visibility === "held"
                ? "Chờ xuất bản"
                : "Kiểm duyệt post"}
          </span>
        </div>
        <Button
          className={styles.mobileBack}
          variant="ghost"
          onClick={onBack}
          disabled={busy}
        >
          ← Danh sách
        </Button>
      </div>
      <div className={styles.preview}>
        <div className={styles.row}>
          <Avatar alt={name(item)} src={item.author?.avatarUrl} />
          <div>
            <strong>{name(item)}</strong>
            <small>
              {date(item.createdAt)} · Phiên bản {item.contentVersion}
            </small>
          </div>
        </div>
        <h2>{item.title}</h2>
        <div className={styles.markdown}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ alt, src }) =>
                typeof src === "string" ? (
                  <a href={src} target="_blank" rel="noopener noreferrer">
                    Ảnh ngoài: {alt || "Xem nguồn ảnh"} ↗
                  </a>
                ) : null,
            }}
          >
            {item.content}
          </ReactMarkdown>
        </div>
        <AttachmentList media={item.media} />
        <div className={styles.checks}>
          <strong className={styles.row}>
            <ReviewIcon /> Kiểm tra trước khi duyệt
          </strong>
          <p className={styles.row}>
            <ReviewIcon kind="file" />{" "}
            {checking
              ? "Đang kiểm tra kết quả quét file…"
              : filesSafe
                ? item.media.length
                  ? `${item.media.length} file: không phát hiện mối đe dọa`
                  : "Không có file đính kèm"
                : "Có file chưa được xác minh. Chưa thể duyệt post."}
          </p>
          {!checking && !filesSafe && (
            <Button
              variant="outline"
              onClick={() => {
                setChecking(true);
                setRetry((r) => r + 1);
              }}
            >
              Kiểm tra lại
            </Button>
          )}
          <p className={styles.row}>
            <ReviewIcon kind="link" />{" "}
            {links.length
              ? `${links.length} liên kết bên ngoài — cần kiểm tra đích đến`
              : "Không phát hiện liên kết bên ngoài"}
          </p>
          {links.map((link) => (
            <a key={link} href={link} target="_blank" rel="noopener noreferrer">
              {new URL(link).hostname} ↗
            </a>
          ))}
          {item.isRevision && (
            <p>Bản đã đăng vẫn hiển thị. Quyết định này áp dụng cho bản sửa.</p>
          )}
        </div>
      </div>
      {item.moderationStatus !== "hidden" && (
        <div className={styles.reviewForm}>
          <Textarea
            id="review-note"
            label="Phản hồi cho người gửi"
            placeholder="Ghi rõ lý do khi yêu cầu sửa hoặc từ chối…"
            rows={3}
            maxLength={2000}
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
          />
          {validation && (
            <p role="alert" className={styles.danger}>
              {validation}
            </p>
          )}
          <div className={styles.actions}>
            <Button
              variant="ghost"
              className={styles.danger}
              disabled={busy}
              onClick={() => decide("hide")}
            >
              {item.moderationStatus === "approved" ? "Ẩn post" : "Từ chối"}
            </Button>
            {item.moderationStatus === "pending" && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => decide("hold")}
                >
                  Yêu cầu sửa
                </Button>
                <Button
                  disabled={busy || checking || !filesSafe}
                  onClick={() => decide("allow")}
                >
                  <ReviewIcon kind="check" /> Duyệt post
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      <details
        className={styles.history}
        open={item.moderationStatus !== "pending"}
      >
        <summary>Lịch sử xử lý ({item.reviews.length})</summary>
        {item.reviews.length ? (
          <ol>
            {item.reviews.map((review) => (
              <li key={review.id}>
                <strong>{decisionLabels[review.decision]}</strong> ·{" "}
                {date(review.createdAt)} · Phiên bản {review.contentVersion}
                <p>{review.note || "Không có ghi chú"}</p>
                <span>Người xử lý: {review.reviewerId}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>Post chưa có quyết định kiểm duyệt.</p>
        )}
      </details>
    </article>
  );
}
